"use client";

import { getAISuggestion } from "@/lib/ai-helper";
import { useAuth } from "@/lib/auth";
import { noteAPI } from "@/lib/elasticsearch-client";
import debounce from "lodash/debounce";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

export default function CreateNotePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  // Kullanıcının girdiği başlık ve özet
  const [userTitle, setUserTitle] = useState("");
  const [userSummary, setUserSummary] = useState("");

  // AI önerileri
  const [aiSuggestions, setAiSuggestions] = useState<{
    suggestedTitle: string;
    suggestedSummary: string;
    language: string;
    wordCount: number;
  } | null>(null);

  // Edit modları
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isSummaryEditing, setIsSummaryEditing] = useState(false);

  // Debounced AI suggestion
  const getAISuggestions = useCallback(
    debounce(async (text: string) => {
      if (text.length < 30) {
        setAiSuggestions(null);
        return;
      }

      setIsAILoading(true);
      try {
        const suggestion = await getAISuggestion(text);

        if (suggestion.success) {
          const aiSuggestion = {
            suggestedTitle: suggestion.title,
            suggestedSummary: suggestion.summary,
            language: suggestion.language,
            wordCount: suggestion.wordCount,
          };

          setAiSuggestions(aiSuggestion);

          // Kullanıcı düzenlemediyse AI önerisini göster
          if (!userTitle) setUserTitle(aiSuggestion.suggestedTitle);
          if (!userSummary) setUserSummary(aiSuggestion.suggestedSummary);

          const languageEmoji = suggestion.language === "tr" ? "🇹🇷" : "🇬🇧";
          toast.success(`${languageEmoji} AI başlık ve özet oluşturuldu!`, {
            duration: 2000,
          });
        }
      } catch (error) {
        console.error("AI suggestion error:", error);
        toast.error("AI servisi geçici olarak kullanılamıyor", {
          duration: 3000,
        });
      } finally {
        setIsAILoading(false);
      }
    }, 1500),
    []
  );

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);

    if (text.trim() && text.length >= 30) {
      getAISuggestions(text);
    } else if (text.trim()) {
      // Kısa içerik için basit başlık
      const firstLine = text.split("\n")[0];
      const simpleTitle =
        firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine;

      if (!userTitle) setUserTitle(simpleTitle);
      if (!userSummary) setUserSummary("");
      setAiSuggestions(null);
    } else {
      setUserTitle("");
      setUserSummary("");
      setAiSuggestions(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) {
      toast.error("Lütfen not içeriği girin");
      return;
    }

    setIsSubmitting(true);
    try {
      // Final başlık ve özet: Kullanıcı düzenlediyse onu, yoksa AI önerisini kullan
      const finalTitle =
        userTitle ||
        aiSuggestions?.suggestedTitle ||
        content.split("\n")[0].substring(0, 60) +
          (content.split("\n")[0].length > 60 ? "..." : "");

      const finalSummary =
        userSummary ||
        aiSuggestions?.suggestedSummary ||
        content.substring(0, 200) + (content.length > 200 ? "..." : "");

      // Elasticsearch'e kaydet
      const note = await noteAPI.createNoteWithAIMetadata({
        userId: user.id,
        content,
        title: finalTitle,
        summary: finalSummary,
        language: aiSuggestions?.language || "tr",
        wordCount: aiSuggestions?.wordCount,
        aiSuggestions: aiSuggestions
          ? {
              suggestedTitle: aiSuggestions.suggestedTitle,
              suggestedSummary: aiSuggestions.suggestedSummary,
              language: aiSuggestions.language,
              wordCount: aiSuggestions.wordCount,
            }
          : undefined,
      });

      // Kullanıcı AI önerisini değiştirdi mi?
      const isEdited = userTitle && userTitle !== aiSuggestions?.suggestedTitle;

      toast.success(
        `📝 Not başarıyla ${isEdited ? "düzenlenerek " : ""}kaydedildi!`,
        {
          duration: 3000,
          icon: isEdited ? "✏️" : "🤖",
        }
      );

      router.push(`/notes/${note._id}`);
    } catch (error) {
      console.error("Not oluşturma hatası:", error);
      toast.error("Not kaydedilemedi. Lütfen tekrar deneyin.", {
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetToAI = () => {
    if (aiSuggestions) {
      setUserTitle(aiSuggestions.suggestedTitle);
      setUserSummary(aiSuggestions.suggestedSummary);
      toast.success("AI önerilerine geri dönüldü!", { duration: 1500 });
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} panoya kopyalandı!`, { duration: 1500 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Yeni Not Oluştur
                </h1>
                <p className="text-blue-100 dark:text-blue-300 mt-1">
                  AI önerilerini kabul edin veya kendiniz düzenleyin
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white/20 dark:bg-gray-900/20 hover:bg-white/30 dark:hover:bg-gray-900/30 text-white rounded-lg transition-colors"
              >
                ← Geri
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Başlık Editörü */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Başlık {aiSuggestions && "✏️"}
                </label>
                <div className="flex items-center space-x-2">
                  {aiSuggestions && (
                    <button
                      onClick={() => setIsTitleEditing(!isTitleEditing)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      {isTitleEditing ? "✅ Kaydet" : "✏️ Düzenle"}
                    </button>
                  )}
                  {aiSuggestions &&
                    userTitle !== aiSuggestions.suggestedTitle && (
                      <button
                        onClick={resetToAI}
                        className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
                      >
                        ↺ AI Önerisine Dön
                      </button>
                    )}
                </div>
              </div>

              {isTitleEditing ? (
                <input
                  type="text"
                  value={userTitle}
                  onChange={(e) => setUserTitle(e.target.value)}
                  className="w-full p-3 border-2 border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  placeholder="Başlığı düzenleyin..."
                  autoFocus
                />
              ) : (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium text-blue-800 dark:text-blue-300 mr-2">
                          {aiSuggestions ? "🤖 AI Önerisi" : "📝 Başlık"}
                        </span>
                        {aiSuggestions && (
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded">
                            {aiSuggestions.language === "tr"
                              ? "🇹🇷 Türkçe"
                              : "🇬🇧 English"}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {userTitle || "AI ile oluşturulacak..."}
                      </p>
                    </div>
                    {aiSuggestions && (
                      <button
                        onClick={() => copyToClipboard(userTitle, "Başlık")}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        title="Kopyala"
                      >
                        📋
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Özet Editörü */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Özet {aiSuggestions && "✏️"}
                </label>
                {aiSuggestions && (
                  <button
                    onClick={() => setIsSummaryEditing(!isSummaryEditing)}
                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                  >
                    {isSummaryEditing ? "✅ Kaydet" : "✏️ Düzenle"}
                  </button>
                )}
              </div>

              {isSummaryEditing ? (
                <textarea
                  value={userSummary}
                  onChange={(e) => setUserSummary(e.target.value)}
                  className="w-full p-3 border-2 border-green-300 dark:border-green-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  placeholder="Özeti düzenleyin..."
                  rows={3}
                  autoFocus
                />
              ) : (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium text-green-800 dark:text-green-300 mr-2">
                          {aiSuggestions ? "🤖 AI Önerisi" : "📋 Özet"}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {userSummary ||
                          (aiSuggestions
                            ? "Özet yükleniyor..."
                            : "AI ile oluşturulacak...")}
                      </p>
                    </div>
                    {aiSuggestions && userSummary && (
                      <button
                        onClick={() => copyToClipboard(userSummary, "Özet")}
                        className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                        title="Kopyala"
                      >
                        📋
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Bilgisi */}
            {aiSuggestions && (
              <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600 dark:text-gray-400">
                      🤖 AI analizi tamamlandı
                    </span>
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 rounded">
                      📊 {aiSuggestions.wordCount} kelime
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      ⚡ Cloudflare Edge
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {userTitle !== aiSuggestions.suggestedTitle ||
                    userSummary !== aiSuggestions.suggestedSummary
                      ? "✏️ Kullanıcı tarafından düzenlendi"
                      : "✅ AI önerisi kullanılıyor"}
                  </div>
                </div>
              </div>
            )}

            {/* Not İçeriği */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Not İçeriği *
                </label>
                <div className="flex items-center space-x-2">
                  {isAILoading && (
                    <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400 mr-1"></div>
                      AI analiz ediyor...
                    </div>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {content.length > 30
                      ? "🤖 AI analiz ediyor..."
                      : "En az 30 karakter yazın"}
                  </span>
                </div>
              </div>
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Notunuzu buraya yazın..."
                className="w-full h-64 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 transition-all"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {content.split(/\s+/).filter((w) => w.length > 0).length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Kelime
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {content.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Karakter
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    3 Ay
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Expire
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {aiSuggestions ? "✅" : "⏳"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    AI Durumu
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {aiSuggestions
                  ? `🤖 ${aiSuggestions.language === "tr" ? "Türkçe" : "İngilizce"} AI Analizi`
                  : "📝 Elasticsearch"}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                disabled={isSubmitting}
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center transition-all shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Elasticsearch'e Kaydediliyor...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {aiSuggestions
                      ? userTitle !== aiSuggestions.suggestedTitle ||
                        userSummary !== aiSuggestions.suggestedSummary
                        ? "✏️ Düzenlenmiş Olarak Kaydet"
                        : "🤖 AI ile Kaydet"
                      : "📝 Not Oluştur"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Özellikler */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
            <div className="text-blue-600 dark:text-blue-400 text-2xl mb-3">
              🤖
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              AI Metadata
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              AI önerileri Elasticsearch'te saklanır. Kullanıcı düzenlemeleri
              izlenir.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-green-100 dark:border-green-900 hover:border-green-300 dark:hover:border-green-700 transition-colors">
            <div className="text-green-600 dark:text-green-400 text-2xl mb-3">
              ✏️
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Esnek Düzenleme
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Başlık ve özeti AI önerisinden bağımsız olarak
              düzenleyebilirsiniz.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-900 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
            <div className="text-purple-600 dark:text-purple-400 text-2xl mb-3">
              📊
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Analitik
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Kelime sayısı, dil tespiti, sentiment analizi ile kapsamlı
              metadata.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
