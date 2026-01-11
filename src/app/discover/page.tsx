// app/discover/page.tsx
"use client";

import { useAuth } from "@/lib/auth";
import { Note, noteAPI } from "@/lib/elasticsearch-client";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Hash,
  LayoutGrid,
  Lightbulb,
  List,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function DiscoverPage() {
  const { user, isLoading } = useAuth();
  const [discoveryNotes, setDiscoveryNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [similarNotes, setSimilarNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalWords: 0,
    languages: [] as string[],
    avgSentiment: 0,
    mostUsedKeywords: [] as string[],
    aiGeneratedCount: 0,
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<
    "similar" | "ai" | "languages" | "trending"
  >("similar");

  // Not arama fonksiyonu
  const searchNotes = useCallback(
    async (query: string) => {
      if (!user || !query.trim()) {
        // Arama boşsa tüm notları göster
        setFilteredNotes(discoveryNotes);
        return;
      }

      setSearchLoading(true);
      try {
        const searchResult = await noteAPI.searchNotes(user.id, query, 1, 50);
        setFilteredNotes(searchResult.notes);
      } catch (error) {
        console.error("Not arama hatası:", error);
        // Hata durumunda tüm notları göster
        setFilteredNotes(discoveryNotes);
      } finally {
        setSearchLoading(false);
      }
    },
    [user, discoveryNotes]
  );

  // Arama input'unda debounce efekti
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(discoveryNotes);
      return;
    }

    const timer = setTimeout(() => {
      searchNotes(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, discoveryNotes, searchNotes]);

  const loadDiscoveryNotes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 1. Tüm notları getir
      const notesResult = await noteAPI.getNotes(user.id, 1, 50);
      setDiscoveryNotes(notesResult.notes);
      setFilteredNotes(notesResult.notes);

      // 2. İlk notu seç ve benzerlerini bul
      if (notesResult.notes.length > 0 && notesResult.notes[0]?._id) {
        const firstNote = notesResult.notes[0];
        setSelectedNote(firstNote);
        const similar = await noteAPI.findSimilarNotes(
          firstNote._id,
          user.id,
          8
        );
        setSimilarNotes(similar);
      }

      // 3. İstatistikleri hesapla
      calculateStats(notesResult.notes);
    } catch (error) {
      console.error("Keşfet verileri yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (notes: Note[]) => {
    const totalWords = notes.reduce(
      (sum, note) => sum + (note.metadata?.wordCount || 0),
      0
    );
    const languages = Array.from(
      new Set(
        notes
          .map((note) => note.metadata?.language || "unknown")
          .filter(Boolean)
      )
    );
    const sentiments = notes
      .map((note) => note.metadata?.sentiment || 0)
      .filter((s) => s !== 0);
    const avgSentiment =
      sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;

    // Anahtar kelime frekansları
    const keywordFrequency: Record<string, number> = {};
    notes.forEach((note) => {
      note.keywords?.forEach((keyword) => {
        keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
      });
    });

    const mostUsedKeywords = Object.entries(keywordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    // AI oluşturulan not sayısı
    const aiGeneratedCount = notes.filter(
      (note) => note.metadata?.aiMetadata
    ).length;

    setStats({
      totalNotes: notes.length,
      totalWords,
      languages,
      avgSentiment,
      mostUsedKeywords,
      aiGeneratedCount,
    });
  };

  const handleNoteSelect = async (note: Note) => {
    if (!note._id || !user) return;

    setSelectedNote(note);
    setLoading(true);
    try {
      const similar = await noteAPI.findSimilarNotes(note._id, user.id, 8);
      setSimilarNotes(similar);
    } catch (error) {
      console.error("Benzer notlar yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return "text-green-600 dark:text-green-400";
    if (score < -0.3) return "text-red-600 dark:text-red-400";
    return "text-yellow-600 dark:text-yellow-400";
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return "😊";
    if (score < -0.3) return "😔";
    return "😐";
  };

  const getNoteInsights = (note: Note) => {
    const insights = [];

    if (note.metadata?.aiMetadata) {
      insights.push({
        icon: <Brain className="w-4 h-4" />,
        text: "AI Önerili",
        color:
          "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
      });
    }

    if (note.metadata?.wordCount) {
      let lengthCategory = "";
      if (note.metadata.wordCount < 100) lengthCategory = "Kısa";
      else if (note.metadata.wordCount < 500) lengthCategory = "Orta";
      else lengthCategory = "Uzun";

      insights.push({
        icon: <FileText className="w-4 h-4" />,
        text: `${lengthCategory} (${note.metadata.wordCount} kelime)`,
        color:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
      });
    }

    if (note.metadata?.sentiment !== undefined) {
      insights.push({
        icon: (
          <div className="w-4 h-4">
            {getSentimentIcon(note.metadata.sentiment)}
          </div>
        ),
        text: getSentimentIcon(note.metadata.sentiment),
        color: getSentimentColor(note.metadata.sentiment),
      });
    }

    return insights;
  };

  // Search bar için handleSearch fonksiyonu
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Clear search butonu
  const handleClearSearch = () => {
    setSearchQuery("");
    setFilteredNotes(discoveryNotes);
  };

  useEffect(() => {
    if (user && !isLoading) {
      loadDiscoveryNotes();
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-900/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary dark:border-primary-foreground mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Keşfet verileriniz yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-900/20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-6 gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 transition-all shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Notlarıma Dön
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  🔍 Notlarını Keşfet
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Elasticsearch ile notlarınızda gizli bağlantıları bulun
                </p>
              </div>
            </div>

            {/* Ana Search Bar */}
            <div className="w-full sm:w-96">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Tüm notlarınızda ara..."
                  className="w-full pl-12 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:focus:ring-purple-600 dark:focus:border-purple-600 shadow-sm transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {searchQuery ? (
                    <span>
                      <span className="font-medium">
                        {filteredNotes.length}
                      </span>{" "}
                      not bulundu
                    </span>
                  ) : (
                    <span>
                      <span className="font-medium">
                        {discoveryNotes.length}
                      </span>{" "}
                      notunuz var
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="hidden sm:inline">Aramak için yazın</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                    /
                  </kbd>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={loadDiscoveryNotes}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Yenileniyor..." : "Yenile"}
              </button>

              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${viewMode === "grid" ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${viewMode === "list" ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam Not
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalNotes}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam Kelime
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalWords.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
                <Hash className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI Notları
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.aiGeneratedCount}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ortalama Duygu
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {getSentimentIcon(stats.avgSentiment)}{" "}
                  {stats.avgSentiment.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-lg">
                <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Panel - Not Listesi */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg sticky top-24">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Notlarınız ({filteredNotes.length})
                  </h3>
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Temizle
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Notlarda ara..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600"
                  />
                  {searchQuery && searchLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {/* Search results info */}
                {searchQuery && (
                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">"{searchQuery}"</span> için{" "}
                    {filteredNotes.length} sonuç
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {searchLoading ? (
                    // Loading state
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse"
                        >
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredNotes.length === 0 ? (
                    // No results state
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {searchQuery ? "Sonuç bulunamadı" : "Henüz notunuz yok"}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {searchQuery
                          ? "Farklı anahtar kelimelerle deneyin veya filtreleri gevşetin"
                          : "İlk notunuzu oluşturmak için '+' butonuna tıklayın"}
                      </p>
                      {!searchQuery && (
                        <Link
                          href="/notes/create"
                          className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
                        >
                          + Yeni Not Oluştur
                        </Link>
                      )}
                    </div>
                  ) : (
                    // Notes list
                    filteredNotes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => handleNoteSelect(note)}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                          selectedNote?.id === note.id
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800"
                            : "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                        }`}
                      >
                        {/* Note content with highlights */}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {/* Highlighted title if searched */}
                            {searchQuery && note._highlight?.title ? (
                              <h4
                                className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                                dangerouslySetInnerHTML={{
                                  __html: note._highlight.title[0],
                                }}
                              />
                            ) : (
                              <h4 className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {note.title}
                              </h4>
                            )}

                            {/* Highlighted summary if searched */}
                            {searchQuery && note._highlight?.content ? (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {note._highlight.content.map(
                                  (fragment, idx) => (
                                    <p
                                      key={idx}
                                      className="mb-1 line-clamp-1"
                                      dangerouslySetInnerHTML={{
                                        __html: fragment,
                                      }}
                                    />
                                  )
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                {note.summary}
                              </p>
                            )}

                            {/* Insights */}
                            <div className="flex flex-wrap gap-1 mt-3">
                              {getNoteInsights(note)
                                .slice(0, 2)
                                .map((insight, idx) => (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${insight.color}`}
                                  >
                                    {insight.icon}
                                    <span>{insight.text}</span>
                                  </span>
                                ))}
                            </div>

                            {/* Keywords with highlights */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {note.keywords.slice(0, 2).map((keyword) => {
                                const isHighlighted =
                                  searchQuery &&
                                  keyword
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase());
                                return (
                                  <span
                                    key={keyword}
                                    className={`px-2 py-1 rounded text-xs ${
                                      isHighlighted
                                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                    }`}
                                  >
                                    {keyword}
                                  </span>
                                );
                              })}
                              {note.keywords.length > 2 && (
                                <span className="px-2 py-1 text-gray-400 dark:text-gray-500 text-xs">
                                  +{note.keywords.length - 2}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight
                            className={`w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors ${
                              selectedNote?.id === note.id
                                ? "text-blue-500"
                                : ""
                            }`}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(note.createdAt).toLocaleDateString(
                              "tr-TR"
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {note.metadata?.wordCount || 0} kelime
                          </span>
                          {/* Relevance score if searched */}
                          {searchQuery && note.relevanceScore && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <Star className="w-3 h-3 fill-current" />
                              {note.relevanceScore.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Popular Keywords */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                Popüler Anahtar Kelimeler
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.mostUsedKeywords.map((keyword) => {
                  const isSearchTerm =
                    searchQuery &&
                    keyword.toLowerCase().includes(searchQuery.toLowerCase());
                  return (
                    <button
                      key={keyword}
                      onClick={() => setSearchQuery(keyword)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                        isSearchTerm
                          ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg"
                          : "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-800/40 dark:hover:to-pink-800/40"
                      }`}
                    >
                      {keyword}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sağ Panel - Seçili Not ve Benzerleri */}
          <div className="lg:col-span-2">
            {selectedNote ? (
              <>
                {/* Seçili Not Detayı */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6 mb-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {selectedNote.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          {selectedNote.metadata?.language || "Türkçe"}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {selectedNote.metadata?.wordCount || 0} kelime
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(selectedNote.createdAt).toLocaleDateString(
                            "tr-TR"
                          )}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/notes/${selectedNote.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all flex items-center gap-2"
                    >
                      İncele
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Search query in context */}
                  {searchQuery && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                          "{searchQuery}" arandı
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Bu not, aramanızla %
                        {Math.round((selectedNote.relevanceScore || 0) * 20)}{" "}
                        ilgili
                      </p>
                    </div>
                  )}

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Özet
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                      {selectedNote.summary}
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Hash className="w-5 h-5 text-blue-500" />
                      Anahtar Kelimeler
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedNote.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Not İstatistikleri */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${getSentimentColor(selectedNote.metadata?.sentiment || 0)}`}
                      >
                        {getSentimentIcon(
                          selectedNote.metadata?.sentiment || 0
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Duygu
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedNote.metadata?.readabilityScore?.toFixed(0) ||
                          "0"}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Okunabilirlik
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedNote.metadata?.aiMetadata ? "✓" : "✗"}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        AI Önerisi
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Date(selectedNote.expiresAt) > new Date()
                          ? "✓"
                          : "✗"}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Aktif
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benzer Notlar */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-500" />
                        Benzer Notlar
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Elasticsearch ile bulunan {similarNotes.length} benzer
                        not
                      </p>
                    </div>

                    {/* Search filter for similar notes */}
                    {searchQuery && similarNotes.length > 0 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          {
                            similarNotes.filter(
                              (n) =>
                                n.title
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase()) ||
                                n.keywords.some((k) =>
                                  k
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase())
                                )
                            ).length
                          }
                        </span>{" "}
                        tanesi aramanızla eşleşiyor
                      </div>
                    )}

                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      <button
                        onClick={() => setActiveTab("similar")}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          activeTab === "similar"
                            ? "bg-white dark:bg-gray-700 shadow-sm"
                            : ""
                        }`}
                      >
                        Benzerler
                      </button>
                      <button
                        onClick={() => setActiveTab("ai")}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          activeTab === "ai"
                            ? "bg-white dark:bg-gray-700 shadow-sm"
                            : ""
                        }`}
                      >
                        AI Notları
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Benzer notlar aranıyor...
                      </p>
                    </div>
                  ) : similarNotes.length > 0 ? (
                    <div
                      className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
                    >
                      {similarNotes.map((note) => (
                        <div
                          key={note.id}
                          className={`group bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/50 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-lg ${
                            viewMode === "list" ? "p-6" : "p-4"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {note.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                                %{Math.round((note.similarityScore || 0) * 100)}
                              </div>
                              {note.metadata?.aiMetadata && (
                                <Brain className="w-4 h-4 text-purple-500" />
                              )}
                            </div>
                          </div>

                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                            {note.summary}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {note.keywords.slice(0, 3).map((keyword) => (
                              <span
                                key={keyword}
                                className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {note.metadata?.wordCount || 0} kelime
                              </span>
                              <span
                                className={`flex items-center gap-1 ${getSentimentColor(note.metadata?.sentiment || 0)}`}
                              >
                                {getSentimentIcon(
                                  note.metadata?.sentiment || 0
                                )}
                              </span>
                            </div>

                            <Link
                              href={`/notes/${note.id}`}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 group"
                            >
                              İncele
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Benzer Not Bulunamadı
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        Bu not için benzer içerik bulunamadı. Notunuz çok
                        benzersiz olabilir veya Elasticsearch daha fazla veriye
                        ihtiyaç duyuyor olabilir.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-12 text-center">
                <Sparkles className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {searchQuery ? "Arama Sonuçları" : "Bir Not Seçin"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  {searchQuery
                    ? `"${searchQuery}" için ${filteredNotes.length} sonuç bulundu. Listeden bir not seçin.`
                    : "Soldaki listeden bir not seçerek Elasticsearch'in benzer notları bulma özelliğini keşfedin."}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span>İçerik Benzerliği</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-500" />
                    <span>AI Analizi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span>İstatistikler</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
