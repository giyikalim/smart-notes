// app/components/AIActionsPanel.tsx
import {
  AI_WORKERS,
  getAIEdit,
  getAIOrganize,
  getAISuggestion,
} from "@/lib/ai-helper";
import { useState } from "react";
import toast from "react-hot-toast";

interface AIActionsPanelProps {
  content: string;
  onApplyEdit: (editedContent: string, type: string, metadata?: any) => void;
  onApplySuggestion: (
    type: "title" | "summary" | "both",
    suggestion: any
  ) => void;
}

export default function AIActionsPanel({
  content,
  onApplyEdit,
  onApplySuggestion,
}: AIActionsPanelProps) {
  const [activeWorker, setActiveWorker] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  const handleAIRequest = async (workerId: string) => {
    if (content.length < 10) {
      toast.error("En az 10 karakter yazın");
      return;
    }

    setIsLoading(true);
    setActiveWorker(workerId);

    try {
      let result;

      switch (workerId) {
        case "suggest":
          result = await getAISuggestion(content);
          if (result.success) {
            setResults((prev) => ({ ...prev, [workerId]: result }));
          }
          break;

        case "edit":
          result = await getAIEdit(content);
          if (result.success) {
            setResults((prev) => ({ ...prev, [workerId]: result }));
          }
          break;

        case "organize":
          result = await getAIOrganize(content);
          if (result.success) {
            setResults((prev) => ({ ...prev, [workerId]: result }));
          }
          break;
      }

      if (result?.success) {
        toast.success(
          `${AI_WORKERS.find((w) => w.id === workerId)?.name} başarıyla çalıştı!`
        );
      } else {
        toast.error(result?.error || "Bir hata oluştu");
      }
    } catch (error) {
      console.error(`AI ${workerId} error:`, error);
      toast.error("AI servisi geçici olarak kullanılamıyor");
    } finally {
      setIsLoading(false);
    }
  };

  // In the applyResult function in AIActionsPanel.tsx
  const applyResult = (workerId: string) => {
    const result = results[workerId];
    if (!result) return;

    switch (workerId) {
      case "suggest":
        if (result.success) {
          onApplySuggestion("both", {
            suggestedTitle: result.title,
            suggestedSummary: result.summary,
            language: result.language,
            wordCount: result.wordCount,
          });
        }
        break;
      case "edit":
        if (result.data) {
          onApplyEdit(result.data.editedContent, "edit", {
            title: result.data.title,
            summary: result.data.summary,
            language: result.data.language,
            wordCount: result.data.wordCount,
          });
        }
        break;
      case "organize":
        if (result.data) {
          onApplyEdit(result.data.editedContent, "organize", {
            changesMade: result.data.changesMade,
            similarityScore: result.data.similarityScore,
            mode: result.data.mode,
          });
        }
        break;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        🤖 AI Araçları
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {AI_WORKERS.map((worker) => (
          <div
            key={worker.id}
            className={`p-4 rounded-lg border ${
              activeWorker === worker.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <span className="text-xl mr-2">{worker.icon}</span>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {worker.name}
                </h4>
              </div>
              {results[worker.id] && (
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded">
                  ✓ Hazır
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {worker.description}
            </p>

            <div className="flex space-x-2">
              <button
                onClick={() => handleAIRequest(worker.id)}
                disabled={isLoading || content.length < worker.minLength}
                className={`flex-1 px-3 py-2 text-sm ${
                  isLoading && activeWorker === worker.id
                    ? "bg-gray-300 dark:bg-gray-700"
                    : `bg-gradient-to-r ${worker.color} hover:opacity-90`
                } text-white rounded-lg transition-all disabled:opacity-50`}
              >
                {isLoading && activeWorker === worker.id ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Çalışıyor...
                  </span>
                ) : (
                  "Çalıştır"
                )}
              </button>

              {results[worker.id]?.success && (
                <button
                  onClick={() => applyResult(worker.id)}
                  className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Uygula
                </button>
              )}
            </div>

            {/* Show results if available */}
            {results[worker.id]?.success && worker.id !== "suggest" && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {worker.id === "edit" && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Değişiklik:</span>
                        <span className="text-green-600 dark:text-green-400">
                          {results[worker.id].data?.editedContent !== content
                            ? "Değişti"
                            : "Aynı kaldı"}
                        </span>
                      </div>
                      {results[worker.id].data?.wordCount && (
                        <div className="flex justify-between">
                          <span>Kelime:</span>
                          <span>{results[worker.id].data.wordCount}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {worker.id === "organize" && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Benzerlik:</span>
                        <span>{results[worker.id].data?.similarityScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Değişiklikler:</span>
                        <span className="text-xs">
                          {results[worker.id].data?.changesMade}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed Results View */}
      {activeWorker && results[activeWorker]?.success && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {AI_WORKERS.find((w) => w.id === activeWorker)?.name} Sonuçları
          </h4>

          {/* Suggest Worker Results */}
          {activeWorker === "suggest" && results.suggest && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Önerilen Başlık:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm">
                    {results.suggest.title}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Dil:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm">
                    <span className="inline-flex items-center">
                      {results.suggest.language === "tr"
                        ? "🇹🇷 Türkçe"
                        : "🇬🇧 English"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Önerilen Özet:
                </label>
                <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm max-h-32 overflow-y-auto">
                  {results.suggest.summary}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {results.suggest.wordCount}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Kelime
                  </div>
                </div>

                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {content.split(/\s+/).filter((w) => w.length > 0).length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Orjinal
                  </div>
                </div>

                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {results.suggest.fallback ? "⚠️" : "✓"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {results.suggest.fallback ? "Fallback" : "AI"}
                  </div>
                </div>
              </div>

              {results.suggest.error && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    {results.suggest.error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Edit Worker Results */}
          {activeWorker === "edit" && results.edit?.data && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Düzenlenmiş İçerik:
                </label>
                <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm max-h-32 overflow-y-auto">
                  {results.edit.data.editedContent}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Önerilen Başlık:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm">
                    {results.edit.data.title}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Önerilen Özet:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm">
                    {results.edit.data.summary}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {results.edit.data.wordCount}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Kelime
                  </div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {content.split(/\s+/).filter((w) => w.length > 0).length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Orjinal
                  </div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {results.edit.data.language === "tr" ? "🇹🇷" : "🇬🇧"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Dil
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Organize Worker Results */}
          {activeWorker === "organize" && results.organize?.data && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Düzenlenmiş İçerik:
                </label>
                <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm max-h-32 overflow-y-auto">
                  {results.organize.data.editedContent}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Orjinal Kelime:
                    </span>
                    <span className="text-sm">
                      {results.organize.data.wordCountOriginal}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Düzenlenmiş Kelime:
                    </span>
                    <span className="text-sm">
                      {results.organize.data.wordCountEdited}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Benzerlik:
                    </span>
                    <span
                      className={`text-sm ${
                        results.organize.data.similarityScore > 90
                          ? "text-green-600 dark:text-green-400"
                          : results.organize.data.similarityScore > 70
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {results.organize.data.similarityScore}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Mod:
                    </span>
                    <span className="text-sm capitalize">
                      {results.organize.data.mode}
                    </span>
                  </div>
                </div>
              </div>

              {results.organize.data.changesMade && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Yapılan Değişiklikler:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-sm">
                    {results.organize.data.changesMade}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {results.organize.data.intensity}/10
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Yoğunluk
                  </div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                    {results.organize.data.preservationLevel}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Koruma
                  </div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {results.organize.data.language === "tr" ? "🇹🇷" : "🇬🇧"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Dil
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
