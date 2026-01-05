// lib/elasticsearch-client.ts - Browser/Edge için
const API_BASE_URL = "/api/elasticsearch";

export interface Note {
  _id: string;
  id: string;
  userId: string;
  title: string;
  content: string;
  summary: string; // Elasticsearch tarafından oluşturulan özet
  keywords: string[]; // Elasticsearch tarafından çıkarılan anahtar kelimeler
  createdAt: string;
  expiresAt: string; // 3 ay sonra otomatik
  relevanceScore?: number; // Arama sırasında relevance score
  isExpired: boolean;
  metadata?: {
    wordCount: number;
    language: string;
    sentiment?: number; // -1 (negatif) to 1 (pozitif)
  };
}

// Elasticsearch için gelişmiş API client
class ElasticsearchNoteAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Elasticsearch ile not oluşturma
  async createNote(userId: string, content: string): Promise<Note> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);

    const title = await this.generateTitleWithElastic(content);
    const summary = await this.generateSummaryWithElastic(content);
    const keywords = await this.extractKeywordsWithElastic(content);

    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      content,
      summary,
      keywords,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      isExpired: false,
      metadata: {
        wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
        language: "tr",
        sentiment: await this.analyzeSentiment(content),
      },
    };

    // Elasticsearch'e kaydet - _id otomatik oluşacak
    const response = await this.request<{
      _id: string;
      result: string;
    }>("/notes/_doc", {
      method: "POST",
      body: JSON.stringify(note),
    });

    // Elasticsearch'in oluşturduğu _id'yi notumuza ekle
    note._id = response._id;
    return note;
  }

  // Not API - Update metodunu güçlendir
  async updateNote(noteId: string, updates: Partial<Note>): Promise<void> {
    // Önce notu bul (hem Elasticsearch _id hem custom id ile)
    const note = await this.getNoteById(noteId);
    if (!note) {
      throw new Error("Not bulunamadı");
    }

    // Elasticsearch _id'sini al
    const elasticId = note._id || noteId;

    // İçerik analizi
    if (updates.content) {
      updates.title =
        updates.title || (await this.generateTitleWithElastic(updates.content));
      updates.summary = await this.generateSummaryWithElastic(updates.content);
      updates.keywords = await this.extractKeywordsWithElastic(updates.content);
      updates.metadata = {
        wordCount: updates.content.split(/\s+/).filter((w) => w.length > 0)
          .length,
        language: "tr",
        sentiment: await this.analyzeSentiment(updates.content),
        lastEdited: new Date().toISOString(),
      };
    }

    // Elasticsearch'e update gönder (_id ile)
    await this.request(`/notes/_update/${elasticId}`, {
      method: "POST",
      body: JSON.stringify({
        doc: updates,
        doc_as_upsert: true,
      }),
    });
  }

  // Elasticsearch ile başlık oluşturma (simülasyon)
  private async generateTitleWithElastic(content: string): Promise<string> {
    // Gerçek uygulamada Elasticsearch'in analyze API'si kullanılır
    const sentences = content.split(/[.!?]+/);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      // İlk cümleyi kısalt ve anlamlı hale getir
      if (firstSentence.length > 60) {
        return firstSentence.substring(0, 60) + "...";
      }
      return firstSentence;
    }

    // Anahtar kelimelerden başlık oluştur
    const keywords = await this.extractKeywordsWithElastic(content);
    if (keywords.length > 0) {
      return keywords.slice(0, 3).join(", ") + " hakkında not";
    }

    return "Yeni Not";
  }

  // Elasticsearch ile gelişmiş analiz
  private async analyzeContentWithElastic(content: string): Promise<{
    suggestedTitle: string;
    suggestedKeywords: string[];
    sentiment: number;
    readabilityScore: number;
  }> {
    // Gerçek uygulamada Elasticsearch API'si kullanılır
    const firstSentence = content.split(/[.!?]+/)[0];

    return {
      suggestedTitle:
        firstSentence.length > 60
          ? firstSentence.substring(0, 60) + "..."
          : firstSentence,
      suggestedKeywords: this.extractKeywordsWithElastic(content),
      sentiment: 0, // Gerçek uygulamada sentiment API
      readabilityScore: Math.min(100, Math.max(0, 100 - content.length / 100)),
    };
  }

  // Elasticsearch ile özet oluşturma (simülasyon)
  private async generateSummaryWithElastic(content: string): Promise<string> {
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);

    if (sentences.length === 0) return content.substring(0, 100) + "...";
    if (sentences.length === 1) return sentences[0].substring(0, 150) + "...";

    // İlk ve son cümleyi al (genellikle en önemli bilgiler)
    const summary = sentences[0] + "... " + sentences[sentences.length - 1];
    return summary.length > 200 ? summary.substring(0, 200) + "..." : summary;
  }

  // Elasticsearch ile anahtar kelime çıkarımı
  private async extractKeywordsWithElastic(content: string): Promise<string[]> {
    const stopWords = new Set([
      "ve",
      "ile",
      "bir",
      "bu",
      "şu",
      "için",
      "ama",
      "fakat",
      "ancak",
      "veya",
      "ya da",
      "gibi",
      "kadar",
      "de",
      "da",
      "ki",
      "mi",
      "mı",
      "mu",
      "mü",
    ]);

    const words = content
      .toLowerCase()
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    // Basit TF-IDF benzeri skorlama
    const wordFrequency: Record<string, number> = {};
    words.forEach((word) => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    return Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word);
  }

  // Sentiment analizi (basit)
  private async analyzeSentiment(text: string): Promise<number> {
    const positiveWords = [
      "iyi",
      "güzel",
      "harika",
      "mükemmel",
      "sevindim",
      "mutlu",
    ];
    const negativeWords = [
      "kötü",
      "üzgün",
      "sorun",
      "problem",
      "hata",
      "kızgın",
    ];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score += 1;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score -= 1;
    });

    // -1 ile 1 arasında normalize et
    return Math.max(-1, Math.min(1, score / 10));
  }

  // Elasticsearch ile gelişmiş arama
  async searchNotes(
    userId: string,
    query: string,
    page = 1,
    pageSize = 10
  ): Promise<{
    notes: Note[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const from = (page - 1) * pageSize;

    const response = await this.request<{
      hits: {
        total: { value: number };
        hits: Array<{
          _source: Note;
          _score: number;
          highlight?: {
            content?: string[];
            title?: string[];
          };
        }>;
      };
    }>("/notes/_search", {
      method: "POST",
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { term: { userId } },
              {
                bool: {
                  should: [
                    {
                      multi_match: {
                        query,
                        fields: [
                          "content^3", // İçerik en önemli
                          "title^2", // Başlık ikinci önemli
                          "keywords^1.5", // Anahtar kelimeler
                          "summary^1", // Özet
                        ],
                        type: "best_fields",
                        fuzziness: "AUTO",
                        operator: "or",
                        minimum_should_match: "50%",
                        tie_breaker: 0.3,
                      },
                    },
                    {
                      match_phrase: {
                        content: {
                          query,
                          slop: 50, // Kelimeler arası maksimum mesafe
                          boost: 2,
                        },
                      },
                    },
                  ],
                },
              },
            ],
            filter: [{ term: { isExpired: false } }],
          },
        },
        highlight: {
          fields: {
            content: {
              fragment_size: 150,
              number_of_fragments: 3,
              pre_tags: ["<mark>"],
              post_tags: ["</mark>"],
            },
            title: {
              pre_tags: ["<mark>"],
              post_tags: ["</mark>"],
            },
          },
        },
        sort: [
          { _score: { order: "desc" } }, // Relevance score
          { createdAt: { order: "desc" } }, // Yeni notlar
        ],
        from,
        size: pageSize,
        aggs: {
          keyword_suggestions: {
            terms: {
              field: "keywords.keyword",
              size: 10,
            },
          },
        },
      }),
    });

    const notes = response.hits.hits.map((hit) => ({
      ...hit._source,
      _id: hit._id,
      relevanceScore: hit._score,
      _highlight: hit.highlight,
    }));

    return {
      notes,
      total: response.hits.total.value,
      page,
      pageSize,
    };
  }

  // Notları getir (expire olmayanlar)
  async getNotes(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{
    notes: Note[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const from = (page - 1) * pageSize;

    const response = await this.request<{
      hits: {
        total: { value: number };
        hits: Array<{ _source: Note }>;
      };
    }>("/notes/_search", {
      method: "POST",
      body: JSON.stringify({
        query: {
          bool: {
            must: [{ term: { userId } }],
            filter: [
              { term: { isExpired: false } },
              {
                range: {
                  expiresAt: {
                    gte: "now", // Süresi dolmamış notlar
                  },
                },
              },
            ],
          },
        },
        sort: [{ createdAt: { order: "desc" } }],
        from,
        size: pageSize,
      }),
    });

    return {
      notes: response.hits.hits.map((hit) => ({
        ...hit._source,
        _id: hit._id,
      })),
      total: response.hits.total.value,
      page,
      pageSize,
    };
  }

  // Not silme
  async deleteNote(noteId: string): Promise<void> {
    // Önce notu bul (hem Elasticsearch _id hem custom id ile)
    const note = await this.getNoteById(noteId);
    if (!note) {
      throw new Error("Not bulunamadı");
    }

    // Elasticsearch _id'sini al
    const elasticId = note._id || noteId;

    // Elasticsearch'ten sil (_id ile)
    await this.request(`/notes/_doc/${elasticId}`, {
      method: "DELETE",
    });
  }

  // Tekil not getirme
  async getNoteById(noteId: string): Promise<Note | null> {
    try {
      // Önce Elasticsearch _id ile deneyelim
      const response = await this.request<{
        _source: Note;
        _id: string;
        found: boolean;
      }>(`/notes/_doc/${noteId}`);

      if (response.found) {
        return {
          ...response._source,
          _id: response._id, // Elasticsearch ID'sini ekle
        };
      }
    } catch (error) {
      console.log(
        "Elasticsearch _id ile bulunamadı, custom id ile aranıyor..."
      );
    }

    // Eğer Elasticsearch _id ile bulunamazsa, bizim id'ye göre ara
    return this.getNoteByCustomId(noteId);
  }

  private async getNoteByCustomId(customId: string): Promise<Note | null> {
    try {
      const response = await this.request<{
        hits: {
          hits: Array<{
            _source: Note;
            _id: string;
          }>;
        };
      }>("/notes/_search", {
        method: "POST",
        body: JSON.stringify({
          query: {
            term: {
              "id.keyword": customId,
            },
          },
        }),
      });

      if (response.hits.hits.length > 0) {
        const hit = response.hits.hits[0];
        return {
          ...hit._source,
          _id: hit._id, // Elasticsearch ID'sini ekle
        };
      }
      return null;
    } catch (error) {
      console.error("Not getirme hatası:", error);
      return null;
    }
  }

  // Notları expire etme (cron job için)
  async expireOldNotes(): Promise<number> {
    const response = await this.request<{
      updated: number;
    }>("/notes/_update_by_query", {
      method: "POST",
      body: JSON.stringify({
        query: {
          range: {
            expiresAt: {
              lte: "now",
            },
          },
        },
        script: {
          source: "ctx._source.isExpired = true",
          lang: "painless",
        },
      }),
    });

    return response.updated || 0;
  }

  // İstatistikler
  async getStats(userId: string): Promise<{
    totalNotes: number;
    activeNotes: number;
    expiredNotes: number;
    avgWordsPerNote: number;
    lastUpdated: string;
  }> {
    const response = await this.request<{
      aggregations: {
        total_notes: { value: number };
        active_notes: { doc_count: number };
        expired_notes: { doc_count: number };
        avg_words: { value: number };
      };
      hits: {
        hits: Array<{
          _source: { createdAt: string };
        }>;
      };
    }>("/notes/_search", {
      method: "POST",
      body: JSON.stringify({
        query: {
          term: { userId },
        },
        aggs: {
          total_notes: { value_count: { field: "id.keyword" } },
          active_notes: {
            filter: { term: { isExpired: false } },
          },
          expired_notes: {
            filter: { term: { isExpired: true } },
          },
          avg_words: {
            avg: { field: "metadata.wordCount" },
          },
        },
        sort: [{ createdAt: { order: "desc" } }],
        size: 1,
      }),
    });

    return {
      totalNotes: response.aggregations?.total_notes?.value || 0,
      activeNotes: response.aggregations?.active_notes?.doc_count || 0,
      expiredNotes: response.aggregations?.expired_notes?.doc_count || 0,
      avgWordsPerNote: response.aggregations?.avg_words?.value || 0,
      lastUpdated:
        response.hits.hits[0]?._source?.createdAt || new Date().toISOString(),
    };
  }
}

export const noteAPI = new ElasticsearchNoteAPI();
