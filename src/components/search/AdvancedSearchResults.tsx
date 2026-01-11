// components/search/AdvancedSearchResults.tsx
"use client";

import { Note } from "@/lib/elasticsearch-client";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, FileText, Frown, Meh, Smile, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdvancedSearchResultsProps {
  notes: Note[];
  total: number;
  aggregations?: any;
  searchParams?: any;
}

export default function AdvancedSearchResults({
  notes,
  total,
  aggregations,
  searchParams,
}: AdvancedSearchResultsProps) {
  const router = useRouter();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    router.push(`/notes/${note._id}`);
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: tr,
    });
  };

  const getSentimentIcon = (sentiment?: number) => {
    if (sentiment === undefined) return null;

    if (sentiment > 0.3) {
      return (
        <Smile className="w-4 h-4 mr-1 text-green-600 dark:text-green-400" />
      );
    } else if (sentiment < -0.3) {
      return <Frown className="w-4 h-4 mr-1 text-red-600 dark:text-red-400" />;
    } else {
      return (
        <Meh className="w-4 h-4 mr-1 text-yellow-600 dark:text-yellow-400" />
      );
    }
  };

  // Aggregations gösterimi için helper
  const renderAggregations = () => {
    if (!aggregations) return null;

    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-blue-100 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          📊 Arama İstatistikleri
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aggregations.languages && aggregations.languages.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Diller
              </p>
              <div className="space-y-1">
                {aggregations.languages.slice(0, 3).map((item: any) => (
                  <div
                    key={item.language}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.language}
                    </span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aggregations.sentimentDistribution && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duygu Dağılımı
              </p>
              <div className="space-y-1">
                {aggregations.sentimentDistribution.map((item: any) => (
                  <div
                    key={item.range}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.range}
                    </span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aggregations.wordCountDistribution && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Uzunluk Dağılımı
              </p>
              <div className="space-y-1">
                {aggregations.wordCountDistribution.map((item: any) => (
                  <div
                    key={item.range}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.range}
                    </span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          🎯 Filtrelere uygun not bulunamadı
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Lütfen filtrelerinizi gevşetin veya farklı kriterlerle tekrar deneyin.
          Elasticsearch tüm notlarınızı taradı ama eşleşme bulamadı.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Header Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            🎯 Gelişmiş Arama Sonuçları
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <FileText className="w-4 h-4 mr-1" />
            {total} not bulundu • Elasticsearch filtreleme aktif
          </p>
        </div>

        <div className="text-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 px-4 py-2 rounded-lg border border-green-100 dark:border-gray-700">
          <span className="font-medium text-green-700 dark:text-green-400">
            ✅ {notes.length}
          </span>
          <span className="text-gray-600 dark:text-gray-400 ml-2">
            not filtrelendi
          </span>
        </div>
      </div>

      {/* Aggregations */}
      {renderAggregations()}

      {/* Active Filters */}
      {searchParams && (
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(searchParams.filters || {}).map(([key, value]) => {
            if (!value) return null;

            let displayValue = "";
            if (key === "dateRange" && typeof value === "object") {
              displayValue = `${value.from} - ${value.to}`;
            } else if (key === "sentimentRange" && typeof value === "object") {
              displayValue = `${value.min} - ${value.max}`;
            } else if (key === "wordCountRange" && typeof value === "object") {
              displayValue = `${value.min} - ${value.max}`;
            } else if (Array.isArray(value)) {
              displayValue = value.join(", ");
            } else {
              displayValue = String(value);
            }

            return (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
              >
                {key}: {displayValue}
              </span>
            );
          })}
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note, index) => (
          <div
            key={`${note.id}-${index}`}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md cursor-pointer"
            onClick={() => handleNoteClick(note)}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {note.title}
                  </h3>

                  {/* Tags */}
                  {note.keywords && note.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {note.keywords.slice(0, 3).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Content Preview */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {note.summary || note.content.substring(0, 200)}...
              </p>

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(note.createdAt)}
                  </div>

                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <FileText className="w-4 h-4 mr-1" />
                    {note.metadata?.wordCount || 0} kelime
                  </div>

                  {note.metadata?.sentiment !== undefined && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      {getSentimentIcon(note.metadata.sentiment)}
                      {note.metadata.sentiment.toFixed(2)}
                    </div>
                  )}

                  {/* Relevance Score */}
                  {note.relevanceScore && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className="mr-1">📊</span>
                      {note.relevanceScore.toFixed(3)}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 dark:text-gray-500">
                  ID: {note.id.substring(0, 8)}...
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
