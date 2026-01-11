// components/search/AdvancedSearchModal.tsx
"use client";

import { tr } from "date-fns/locale";
import {
  Calendar,
  Filter,
  Globe,
  Hash,
  SortAsc,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: any) => void;
  userId: string;
}

const LANGUAGES = [
  { code: "tr", name: "Türkçe" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
];

const SENTIMENT_RANGES = [
  { label: "Çok Olumsuz", min: -1, max: -0.5 },
  { label: "Olumsuz", min: -0.5, max: -0.1 },
  { label: "Nötr", min: -0.1, max: 0.1 },
  { label: "Olumlu", min: 0.1, max: 0.5 },
  { label: "Çok Olumlu", min: 0.5, max: 1 },
];

const WORD_COUNT_RANGES = [
  { label: "Kısa (0-100)", min: 0, max: 100 },
  { label: "Orta (100-500)", min: 100, max: 500 },
  { label: "Uzun (500-1000)", min: 500, max: 1000 },
  { label: "Çok Uzun (1000+)", min: 1000, max: 5000 },
];

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  onSearch,
  userId,
}: AdvancedSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [sentimentRange, setSentimentRange] = useState<{
    min?: number;
    max?: number;
  }>({});
  const [wordCountRange, setWordCountRange] = useState<{
    min?: number;
    max?: number;
  }>({});
  const [hasAI, setHasAI] = useState<boolean | undefined>(undefined);
  const [keywords, setKeywords] = useState("");
  const [sortBy, setSortBy] = useState<
    "relevance" | "date" | "wordCount" | "sentiment"
  >("relevance");
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(language)
        ? prev.filter((l) => l !== language)
        : [...prev, language]
    );
  };

  const handleSentimentSelect = (min: number, max: number) => {
    if (sentimentRange.min === min && sentimentRange.max === max) {
      setSentimentRange({});
    } else {
      setSentimentRange({ min, max });
    }
  };

  const handleWordCountSelect = (min: number, max: number) => {
    if (wordCountRange.min === min && wordCountRange.max === max) {
      setWordCountRange({});
    } else {
      setWordCountRange({ min, max });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filters = {
      userId,
      query: query.trim() || undefined,
      filters: {
        dateRange: {
          from: dateRange[0].startDate.toISOString().split("T")[0],
          to: dateRange[0].endDate.toISOString().split("T")[0],
        },
        ...(sentimentRange.min !== undefined &&
          sentimentRange.max !== undefined && {
            sentimentRange: {
              min: sentimentRange.min,
              max: sentimentRange.max,
            },
          }),
        ...(wordCountRange.min !== undefined &&
          wordCountRange.max !== undefined && {
            wordCountRange: {
              min: wordCountRange.min,
              max: wordCountRange.max,
            },
          }),
        ...(selectedLanguages.length > 0 && { languages: selectedLanguages }),
        ...(hasAI !== undefined && { hasAI }),
        ...(keywords.trim() && {
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k),
        }),
      },
      sortBy,
    };

    onSearch(filters);
    onClose();
  };

  const handleReset = () => {
    setQuery("");
    setSelectedLanguages([]);
    setSentimentRange({});
    setWordCountRange({});
    setHasAI(undefined);
    setKeywords("");
    setSortBy("relevance");
    setDateRange([
      {
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        endDate: new Date(),
        key: "selection",
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl transition-all">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Filter className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    🔍 Gelişmiş Arama
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Elasticsearch ile detaylı filtreleme
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Query Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Sparkles className="w-4 h-4 inline mr-2 text-blue-500" />
                  Anahtar Kelimeler
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Notlarınızda arayın... (Elasticsearch fuzziness etkin)"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-all"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  📝 Başlık, içerik, özet ve anahtar kelimelerde arama yapar.
                  Otomatik düzeltme (fuzziness) etkindir.
                </p>
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Calendar className="w-4 h-4 inline mr-2 text-blue-500" />
                    Tarih Aralığı
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
                    <DateRange
                      editableDateInputs={true}
                      onChange={(item: any) => setDateRange([item.selection])}
                      moveRangeOnFirstSelection={false}
                      ranges={dateRange}
                      rangeColors={["#3b82f6"]}
                      locale={tr}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Globe className="w-4 h-4 inline mr-2 text-blue-500" />
                    Diller
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageToggle(lang.code)}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          selectedLanguages.includes(lang.code)
                            ? "bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-700 text-white"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sentiment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    😊 Duygu Analizi
                  </label>
                  <div className="space-y-2">
                    {SENTIMENT_RANGES.map((range) => (
                      <button
                        key={range.label}
                        type="button"
                        onClick={() =>
                          handleSentimentSelect(range.min, range.max)
                        }
                        className={`w-full px-4 py-3 rounded-lg border transition-all text-left ${
                          sentimentRange.min === range.min &&
                          sentimentRange.max === range.max
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 border-transparent text-white"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Word Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Hash className="w-4 h-4 inline mr-2 text-blue-500" />
                    Kelime Sayısı
                  </label>
                  <div className="space-y-2">
                    {WORD_COUNT_RANGES.map((range) => (
                      <button
                        key={range.label}
                        type="button"
                        onClick={() =>
                          handleWordCountSelect(range.min, range.max)
                        }
                        className={`w-full px-4 py-3 rounded-lg border transition-all text-left ${
                          wordCountRange.min === range.min &&
                          wordCountRange.max === range.max
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 border-transparent text-white"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Zap className="w-4 h-4 inline mr-2 text-blue-500" />
                    AI İçeriği
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setHasAI(true)}
                      className={`px-4 py-3 rounded-lg border transition-all ${
                        hasAI === true
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 border-transparent text-white"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      AI Var
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasAI(false)}
                      className={`px-4 py-3 rounded-lg border transition-all ${
                        hasAI === false
                          ? "bg-gradient-to-r from-gray-600 to-gray-700 border-transparent text-white"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      AI Yok
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasAI(undefined)}
                      className={`px-4 py-3 rounded-lg border transition-all ${
                        hasAI === undefined
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 border-transparent text-white"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      Hepsi
                    </button>
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <SortAsc className="w-4 h-4 inline mr-2 text-blue-500" />
                    Sıralama
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-all"
                  >
                    <option value="relevance">
                      📊 İlgililik (Elasticsearch Score)
                    </option>
                    <option value="date">
                      📅 Tarihe Göre (Yeniden Eskiye)
                    </option>
                    <option value="wordCount">📝 Kelime Sayısına Göre</option>
                    <option value="sentiment">😊 Duygu Skoruna Göre</option>
                  </select>
                </div>

                {/* Keywords Filter */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Hash className="w-4 h-4 inline mr-2 text-blue-500" />
                    Özel Anahtar Kelimeler
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="anahtar1, anahtar2, anahtar3 (virgülle ayırın)"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-all"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-8 py-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Filtreleri Sıfırla
              </button>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  🔍 Arama Yap
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
