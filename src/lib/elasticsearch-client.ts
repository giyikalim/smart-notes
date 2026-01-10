// lib/elasticsearch-client.ts - Browser/Edge için
const API_BASE_URL = "/api/elasticsearch";

// In lib/elasticsearch-client.ts, update the Note interface:
export interface Note {
  _id?: string;
  id: string;
  userId: string;
  title: string;
  content: string;
  summary: string;
  keywords: string[];
  createdAt: string;
  expiresAt: string;
  relevanceScore?: number;
  isExpired: boolean;
  metadata: {
    wordCount: number;
    language: string;
    sentiment?: number;
    aiMetadata?: {
      suggestedTitle: string;
      suggestedSummary: string;
      isAISuggested: boolean;
      aiLanguage: string;
      aiWordCount: number;
      userEdited?: boolean;
      editedAt?: string;
      // Add AI operations tracking
      aiOperations?: {
        edited?: boolean;
        organized?: boolean;
        editTimestamp?: string;
        organizeTimestamp?: string;
        lastAIOperation?: string;
      };
    };
    readabilityScore?: number;
    lastEdited?: string;
    // Add AI operations history
    aiOperationsHistory?: Array<{
      operation: string;
      timestamp: string;
      changesMade?: string;
      similarityScore?: number;
    }>;
  };
}

export interface CreateNoteOptions {
  userId: string;
  content: string;
  title?: string;
  summary?: string;
  language?: string;
  wordCount?: number;
  aiSuggestions?: {
    suggestedTitle: string;
    suggestedSummary: string;
    language: string;
    wordCount: number;
  };
}

export interface UpdateNoteOptions {
  noteId: string;
  title?: string;
  summary?: string;
  content?: string;
  isEditedByUser?: boolean;
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

  // Yeni: AI metadata ile not oluştur
  async createNoteWithAIMetadata(options: CreateNoteOptions): Promise<Note> {
    const {
      userId,
      content,
      title,
      summary,
      language = "tr",
      wordCount,
      aiSuggestions,
    } = options;

    // Expire tarihi (3 ay sonra)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);

    // Başlık ve özet belirlenmesi
    const finalTitle =
      title ||
      aiSuggestions?.suggestedTitle ||
      (await this.generateTitleWithElastic(content));

    const finalSummary =
      summary ||
      aiSuggestions?.suggestedSummary ||
      (await this.generateSummaryWithElastic(content));

    // Kelime sayısı
    const finalWordCount =
      wordCount ||
      aiSuggestions?.wordCount ||
      content.split(/\s+/).filter((w) => w.length > 0).length;

    // Dil
    const finalLanguage = aiSuggestions?.language || language;

    // Kullanıcı AI önerisini değiştirdi mi?
    const userEditedTitle =
      title && aiSuggestions && title !== aiSuggestions.suggestedTitle;
    const userEditedSummary =
      summary && aiSuggestions && summary !== aiSuggestions.suggestedSummary;
    const userEdited = userEditedTitle || userEditedSummary;

    // Anahtar kelimeler ve sentiment analizi
    const keywords = await this.extractKeywordsWithElastic(content);
    const sentiment = await this.analyzeSentiment(content);

    // Not objesi oluştur
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: finalTitle,
      content,
      summary: finalSummary,
      keywords,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      isExpired: false,
      metadata: {
        wordCount: finalWordCount,
        language: finalLanguage,
        sentiment,
        readabilityScore: await this.calculateReadability(content),
        ...(aiSuggestions && {
          aiMetadata: {
            suggestedTitle: aiSuggestions.suggestedTitle || "",
            suggestedSummary: aiSuggestions.suggestedSummary || "",
            isAISuggested: true,
            aiLanguage: aiSuggestions.language || "tr",
            aiWordCount: aiSuggestions.wordCount || content.length,
            userEdited: userEdited || false,
            ...(userEdited && { editedAt: new Date().toISOString() }),
          },
        }),
      },
    };

    // Elasticsearch'e kaydet
    const response = await this.request<{
      _id: string;
      result: string;
    }>("/notes/_doc", {
      method: "POST",
      body: JSON.stringify(note),
    });

    note._id = response._id;
    return note;
  }

  // Eski fonksiyon (geriye dönük uyumluluk için)
  async createNoteWithAI(
    userId: string,
    content: string,
    title: string,
    summary: string,
    language?: string,
    wordCount?: number,
    aiMetadata?: {
      ai_title?: string;
      ai_summary?: string;
      ai_suggested?: boolean;
    }
  ): Promise<Note> {
    const options: CreateNoteOptions = {
      userId,
      content,
      title,
      summary,
      language,
      wordCount,
    };

    if (aiMetadata) {
      options.aiSuggestions = {
        suggestedTitle: aiMetadata.ai_title || title,
        suggestedSummary: aiMetadata.ai_summary || summary,
        language: language || "tr",
        wordCount:
          wordCount || content.split(/\s+/).filter((w) => w.length > 0).length,
      };
    }

    return this.createNoteWithAIMetadata(options);
  }

  // Orijinal createNote (AI olmadan)
  async createNote(userId: string, content: string): Promise<Note> {
    const title = await this.generateTitleWithElastic(content);
    const summary = await this.generateSummaryWithElastic(content);

    return this.createNoteWithAIMetadata({
      userId,
      content,
      title,
      summary,
    });
  }

  // Not güncelleme (başlık, özet, içerik)
  async updateNote(options: UpdateNoteOptions): Promise<Note> {
    const { noteId, title, summary, content, isEditedByUser = true } = options;

    // Önce notu bul
    const existingNote = await this.getNoteById(noteId);
    if (!existingNote) {
      throw new Error("Not bulunamadı");
    }

    const elasticId = existingNote._id || noteId;
    const updates: any = {
      metadata: {
        ...existingNote.metadata,
        lastEdited: new Date().toISOString(),
      },
    };

    // İçerik değiştiyse analiz yap
    if (content) {
      updates.content = content;
      updates.keywords = await this.extractKeywordsWithElastic(content);
      updates.metadata = {
        ...updates.metadata,
        wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
        sentiment: await this.analyzeSentiment(content),
        readabilityScore: await this.calculateReadability(content),
      };

      // Eğer başlık veya özet sağlanmadıysa, otomatik oluştur
      if (!title) {
        updates.title = await this.generateTitleWithElastic(content);
      }
      if (!summary) {
        updates.summary = await this.generateSummaryWithElastic(content);
      }
    }

    // Başlık güncelleme
    if (title) {
      updates.title = title;

      // AI metadata varsa, kullanıcı düzenledi mi kontrol et
      if (existingNote.metadata?.aiMetadata) {
        updates.metadata = {
          ...updates.metadata,
          aiMetadata: {
            ...existingNote.metadata.aiMetadata,
            userEdited:
              isEditedByUser || existingNote.metadata.aiMetadata.userEdited,
            editedAt: new Date().toISOString(),
          },
        };
      }
    }

    // Özet güncelleme
    if (summary) {
      updates.summary = summary;

      // AI metadata varsa, kullanıcı düzenledi mi kontrol et
      if (existingNote.metadata?.aiMetadata) {
        updates.metadata = {
          ...updates.metadata,
          aiMetadata: {
            ...existingNote.metadata.aiMetadata,
            userEdited:
              isEditedByUser || existingNote.metadata.aiMetadata.userEdited,
            editedAt: new Date().toISOString(),
          },
        };
      }
    }

    // Elasticsearch'e update gönder
    await this.request(`/notes/_update/${elasticId}`, {
      method: "POST",
      body: JSON.stringify({
        doc: updates,
      }),
    });

    // Güncellenmiş notu getir
    return this.getNoteById(noteId) as Promise<Note>;
  }

  // Elasticsearch ile başlık oluşturma
  private async generateTitleWithElastic(content: string): Promise<string> {
    const sentences = content.split(/[.!?]+/);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length > 60) {
        return firstSentence.substring(0, 60) + "...";
      }
      return firstSentence;
    }

    const keywords = await this.extractKeywordsWithElastic(content);
    if (keywords.length > 0) {
      return keywords.slice(0, 3).join(", ") + " hakkında not";
    }

    return "Yeni Not";
  }

  // Elasticsearch ile özet oluşturma
  private async generateSummaryWithElastic(content: string): Promise<string> {
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);

    if (sentences.length === 0) return content.substring(0, 100) + "...";
    if (sentences.length === 1) return sentences[0].substring(0, 150) + "...";

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
      "the",
      "and",
      "or",
      "but",
      "for",
      "with",
      "that",
      "this",
      "these",
      "those",
    ]);

    const words = content
      .toLowerCase()
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    const wordFrequency: Record<string, number> = {};
    words.forEach((word) => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    return Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word);
  }

  // Sentiment analizi
  private async analyzeSentiment(text: string): Promise<number> {
    const positiveWords = [
      "iyi",
      "güzel",
      "harika",
      "mükemmel",
      "sevindim",
      "mutlu",
      "başarılı",
      "good",
      "great",
      "excellent",
      "happy",
      "successful",
      "perfect",
    ];
    const negativeWords = [
      "kötü",
      "üzgün",
      "sorun",
      "problem",
      "hata",
      "kızgın",
      "başarısız",
      "bad",
      "sad",
      "problem",
      "error",
      "angry",
      "failed",
    ];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score += 1;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score -= 1;
    });

    return Math.max(-1, Math.min(1, score / 10));
  }

  // Okunabilirlik puanı
  private async calculateReadability(text: string): Promise<number> {
    const words = text.split(/\s+/).filter((w) => w.length > 0).length;
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;

    // Basit okunabilirlik formülü (yüksek puan = daha okunabilir)
    let score = 100;
    if (avgWordsPerSentence > 25) score -= 20;
    if (avgWordsPerSentence > 35) score -= 20;
    if (words > 500) score -= 10;
    if (words > 1000) score -= 10;

    return Math.max(0, Math.min(100, score));
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
                          "content^3",
                          "title^2",
                          "keywords^1.5",
                          "summary^1",
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
                          slop: 50,
                          boost: 2,
                        },
                      },
                    },
                  ],
                },
              },
            ],
            filter: [
              { term: { isExpired: false } },
              {
                range: {
                  expiresAt: {
                    gte: "now",
                  },
                },
              },
            ],
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
        sort: [{ _score: { order: "desc" } }, { createdAt: { order: "desc" } }],
        from,
        size: pageSize,
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

  // Notları getir
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
        hits: Array<{ _source: Note; _id: string }>;
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
                    gte: "now",
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
    const note = await this.getNoteById(noteId);
    if (!note) {
      throw new Error("Not bulunamadı");
    }

    const elasticId = note._id || noteId;

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
          _id: response._id,
        };
      }
    } catch (error) {
      console.log(
        "Elasticsearch _id ile bulunamadı, custom id ile aranıyor..."
      );
    }

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
          _id: hit._id,
        };
      }
      return null;
    } catch (error) {
      console.error("Not getirme hatası:", error);
      return null;
    }
  }

  // Notları expire etme
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
    aiGeneratedNotes: number;
    userEditedNotes: number;
  }> {
    const response = await this.request<{
      aggregations: {
        total_notes: { value: number };
        active_notes: { doc_count: number };
        expired_notes: { doc_count: number };
        avg_words: { value: number };
        ai_generated: { doc_count: number };
        user_edited: { doc_count: number };
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
          ai_generated: {
            filter: {
              exists: { field: "metadata.aiMetadata" },
            },
          },
          user_edited: {
            filter: {
              term: { "metadata.aiMetadata.userEdited": true },
            },
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
      aiGeneratedNotes: response.aggregations?.ai_generated?.doc_count || 0,
      userEditedNotes: response.aggregations?.user_edited?.doc_count || 0,
    };
  }

  // AI önerili notları getir
  async getAINotes(
    userId: string,
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
        hits: Array<{ _source: Note; _id: string }>;
      };
    }>("/notes/_search", {
      method: "POST",
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { term: { userId } },
              { exists: { field: "metadata.aiMetadata" } },
            ],
            filter: [
              { term: { isExpired: false } },
              {
                range: {
                  expiresAt: {
                    gte: "now",
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

  // Kullanıcı tarafından düzenlenmiş AI notları
  async getUserEditedAINotes(
    userId: string,
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
        hits: Array<{ _source: Note; _id: string }>;
      };
    }>("/notes/_search", {
      method: "POST",
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { term: { userId } },
              { exists: { field: "metadata.aiMetadata" } },
              { term: { "metadata.aiMetadata.userEdited": true } },
            ],
            filter: [
              { term: { isExpired: false } },
              {
                range: {
                  expiresAt: {
                    gte: "now",
                  },
                },
              },
            ],
          },
        },
        sort: [{ "metadata.aiMetadata.editedAt": { order: "desc" } }],
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

  // Dil bazlı notları getir
  async getNotesByLanguage(
    userId: string,
    language: string,
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
        hits: Array<{ _source: Note; _id: string }>;
      };
    }>("/notes/_search", {
      method: "POST",
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { term: { userId } },
              { term: { "metadata.language.keyword": language } },
            ],
            filter: [
              { term: { isExpired: false } },
              {
                range: {
                  expiresAt: {
                    gte: "now",
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
}

export const noteAPI = new ElasticsearchNoteAPI();
