"use client";

import { getAISuggestion } from "@/lib/ai-helper";
import { useAuth } from "@/lib/auth";
import { noteAPI } from "@/lib/elasticsearch-client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function NoteDetailPage({ searchParam }) {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const searchParams = useSearchParams();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // State'lere ekleyin:
  const [aiSuggestions, setAiSuggestions] = useState<{
    suggestedTitle: string;
    suggestedSummary: string;
    language: string;
    wordCount: number;
  } | null>(null);

  const [isAILoading, setIsAILoading] = useState(false);
  const [showAIRequestPanel, setShowAIRequestPanel] = useState(false);
  const [isSummaryEditing, setIsSummaryEditing] = useState(false);
  const [editSummary, setEditSummary] = useState("");

  useEffect(() => {
    const editMode = searchParams.get("edit") === "true";
    setIsEditing(editMode);
  }, [searchParams]);

  // Not verilerini getir
  const {
    data: note,
    status,
    refetch,
  } = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      return await noteAPI.getNoteById(noteId);
    },
    enabled: !!noteId && !!user,
  });

  // Elasticsearch ile analiz edilmiş öneriler
  const [elasticSuggestions, setElasticSuggestions] = useState<{
    keywords: string[];
    sentiment: number;
  }>({
    keywords: [],
    sentiment: 0,
  });

  // İlk yükleme
  useEffect(() => {
    if (note) {
      setEditContent(note.content);
      setEditTitle(note.title);
      setEditSummary(note.summary || "");
      // ... diğer state'ler

      // AI metadata varsa yükle
      if (note.metadata?.aiMetadata) {
        setAiSuggestions({
          suggestedTitle: note.metadata.aiMetadata.suggestedTitle,
          suggestedSummary: note.metadata.aiMetadata.suggestedSummary,
          language: note.metadata.aiMetadata.aiLanguage,
          wordCount: note.metadata.aiMetadata.aiWordCount,
        });
      }
    }
  }, [note]);

  // Düzenleme moduna geç
  useEffect(() => {
    if (note && isEditing) {
      setEditContent(note.content);
      setEditTitle(note.title);
      analyzeContent(note.content);
    }
  }, [note, isEditing]);

  // İçerik değiştiğinde Elasticsearch analizi yap
  const handleContentChange = async (content: string) => {
    setEditContent(content);
    if (content.length > 10) {
      analyzeContent(content);
    }
  };

  // Elasticsearch ile içerik analizi
  const analyzeContent = async (content: string) => {
    try {
      // Anahtar kelime çıkarımı
      const keywords = content
        .toLowerCase()
        .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .slice(0, 5);

      // Duygu analizi (basit)
      const positiveWords = ["iyi", "güzel", "harika", "mükemmel", "sevindim"];
      const negativeWords = ["kötü", "üzgün", "sorun", "problem", "hata"];
      let sentiment = 0;

      const lowerContent = content.toLowerCase();
      positiveWords.forEach((word) => {
        if (lowerContent.includes(word)) sentiment += 0.2;
      });
      negativeWords.forEach((word) => {
        if (lowerContent.includes(word)) sentiment -= 0.2;
      });

      setElasticSuggestions({
        keywords: [...new Set([...(note?.keywords || []), ...keywords])],
        sentiment: Math.max(-1, Math.min(1, sentiment)),
      });
    } catch (error) {
      console.error("Analiz hatası:", error);
    }
  };

  // Notu kaydet
  const handleSaveNote = async () => {
    if (!note || !editContent.trim()) {
      toast.error("Lütfen not içeriği girin");
      return;
    }

    setIsSaving(true);
    try {
      // AI metadata'yı güncelle
      const aiMetadata = aiSuggestions
        ? {
            suggestedTitle: aiSuggestions.suggestedTitle,
            suggestedSummary: aiSuggestions.suggestedSummary,
            isAISuggested: true,
            aiLanguage: aiSuggestions.language,
            aiWordCount: aiSuggestions.wordCount,
            userEdited:
              editTitle !== aiSuggestions.suggestedTitle ||
              editSummary !== aiSuggestions.suggestedSummary,
            editedAt: new Date().toISOString(),
          }
        : note.metadata?.aiMetadata;

      const updates = {
        content: editContent,
        title: editTitle,
        summary: editSummary || (await generateSummary(editContent)),
        keywords: elasticSuggestions.keywords.slice(0, 8),
        metadata: {
          ...note.metadata,
          wordCount: editContent.split(/\s+/).filter((w) => w.length > 0)
            .length,
          language: "tr",
          sentiment: elasticSuggestions.sentiment,
          lastEdited: new Date().toISOString(),
          aiMetadata,
        },
      };

      await noteAPI.updateNote({ noteId, ...updates });
      toast.success("Not Elasticsearch'e kaydedildi!", {
        icon: aiSuggestions ? "🤖" : "✏️",
      });
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      toast.error("Not kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  };

  // Özet oluştur
  const generateSummary = async (content: string): Promise<string> => {
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    if (sentences.length === 0) return content.substring(0, 100) + "...";

    if (sentences.length === 1) return sentences[0].substring(0, 150) + "...";

    // İlk ve son cümleyi al
    const summary = sentences[0] + "... " + sentences[sentences.length - 1];
    return summary.length > 200 ? summary.substring(0, 200) + "..." : summary;
  };

  // Not sil
  const handleDeleteNote = async () => {
    if (
      !confirm(
        "Bu notu silmek istediğinize emin misiniz? Bu işlem geri alınamaz!"
      )
    ) {
      return;
    }

    try {
      await noteAPI.deleteNote(noteId);
      toast.success("Not silindi!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Silme hatası:", error);
      toast.error("Not silinemedi.");
    }
  };

  // Expire süresini uzat
  const handleExtendExpire = async () => {
    if (!note) return;

    try {
      const newExpiresAt = new Date();
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 3); // 3 ay daha ekle

      await noteAPI.updateNote({
        noteId,
        expiresAt: newExpiresAt.toISOString(),
        isExpired: false,
      });

      toast.success("Expire süresi 3 ay uzatıldı!");
      refetch();
    } catch (error) {
      console.error("Expire uzatma hatası:", error);
      toast.error("Süre uzatılamadı.");
    }
  };

  // Loading state
  if (status === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error" || !note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-6">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Not bulunamadı
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Bu not silinmiş olabilir veya erişim izniniz yok.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
          >
            ← Notlarıma Dön
          </Link>
        </div>
      </div>
    );
  }

  // Fonksiyonları ekleyin:
  const requestAIReview = async () => {
    if (editContent.length < 30) {
      toast.error("En az 30 karakter yazın");
      return;
    }

    setIsAILoading(true);
    try {
      const suggestion = await getAISuggestion(editContent);

      if (suggestion.success) {
        const aiSuggestion = {
          suggestedTitle: suggestion.title,
          suggestedSummary: suggestion.summary,
          language: suggestion.language,
          wordCount: suggestion.wordCount,
        };

        setAiSuggestions(aiSuggestion);
        setShowAIRequestPanel(true);

        const languageEmoji = suggestion.language === "tr" ? "🇹🇷" : "🇬🇧";
        toast.success(`${languageEmoji} AI yeni öneriler hazırladı!`, {
          duration: 2000,
        });
      } else {
        toast.error(suggestion.error || "AI önerisi alınamadı", {
          duration: 3000,
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
  };

  const applyAISuggestion = (type: "title" | "summary" | "both") => {
    if (!aiSuggestions) return;

    switch (type) {
      case "title":
        setEditTitle(aiSuggestions.suggestedTitle);
        toast.success("AI başlık önerisi uygulandı!");
        break;
      case "summary":
        setEditSummary(aiSuggestions.suggestedSummary);
        toast.success("AI özet önerisi uygulandı!");
        break;
      case "both":
        setEditTitle(aiSuggestions.suggestedTitle);
        setEditSummary(aiSuggestions.suggestedSummary);
        toast.success("AI başlık ve özet önerileri uygulandı!");
        break;
    }
  };

  // Format tarih
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Expire durumu
  const isExpired = note.isExpired || new Date(note.expiresAt) < new Date();
  const daysLeft = Math.ceil(
    (new Date(note.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Notlarıma Dön
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isEditing ? "Notu Düzenle" : note.title}
              </h1>
            </div>

            <div className="flex space-x-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                  >
                    ✏️ Düzenle
                  </button>
                  <button
                    onClick={handleExtendExpire}
                    className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
                  >
                    ⏰ {isExpired ? "Aktif Et" : "3 Ay Uzat"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  İptal
                </button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <span className="font-medium mr-1">Oluşturulma:</span>
              {formatDate(note.createdAt)}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Expire:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  isExpired
                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                    : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                }`}
              >
                {isExpired
                  ? `Süresi Doldu (${formatDate(note.expiresAt)})`
                  : `${daysLeft} gün kaldı`}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Kelime:</span>
              {note.metadata?.wordCount || 0}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Durum:</span>
              {note.isExpired ? "Expired" : "Active"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Sol (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {isEditing ? (
                <>
                  {/* Edit Mode */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Başlık *
                      </label>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Başlık ve özet için AI'dan yardım alın
                        </span>
                        <button
                          onClick={requestAIReview}
                          disabled={isAILoading || editContent.length < 30}
                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all"
                        >
                          {isAILoading
                            ? "🤖 Analiz ediliyor..."
                            : "🤖 AI'a Sor"}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-blue-600 dark:focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        placeholder="Not başlığı..."
                      />

                      {/* AI ÖNERİSİ GÖSTER */}
                      {aiSuggestions &&
                        editTitle !== aiSuggestions.suggestedTitle && (
                          <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-xs text-purple-700 dark:text-purple-300 mb-1">
                                  🤖 AI Başlık Önerisi:
                                </div>
                                <span className="text-sm font-medium">
                                  {aiSuggestions.suggestedTitle}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditTitle(aiSuggestions.suggestedTitle);
                                  toast.success("AI başlık önerisi uygulandı!");
                                }}
                                className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                              >
                                Kullan
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Özet
                        </label>
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              setIsSummaryEditing(!isSummaryEditing)
                            }
                            className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                          >
                            {isSummaryEditing ? "✅ Kaydet" : "✏️ Düzenle"}
                          </button>
                          {aiSuggestions &&
                            editSummary !== aiSuggestions.suggestedSummary && (
                              <button
                                onClick={() => {
                                  setEditSummary(
                                    aiSuggestions.suggestedSummary
                                  );
                                  toast.success("AI özet önerisi uygulandı!");
                                }}
                                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                              >
                                🤖 AI Önerisini Kullan
                              </button>
                            )}
                        </div>
                      </div>

                      {isSummaryEditing ? (
                        <textarea
                          value={editSummary}
                          onChange={(e) => setEditSummary(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-green-300 dark:border-green-600 rounded-lg focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 focus:border-green-600 dark:focus:border-green-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none"
                          placeholder="Özeti düzenleyin..."
                          rows={3}
                        />
                      ) : (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-gray-700 dark:text-gray-300">
                            {editSummary || "Özet yok"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          İçerik *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {showPreview ? "Düzenle" : "Önizleme"}
                        </button>
                      </div>

                      {showPreview ? (
                        <div className="min-h-[400px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                          {editContent || "İçerik yok..."}
                        </div>
                      ) : (
                        <textarea
                          value={editContent}
                          onChange={(e) => handleContentChange(e.target.value)}
                          className="w-full min-h-[400px] p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-blue-600 dark:focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base leading-relaxed"
                          placeholder="Not içeriğinizi buraya yazın..."
                          autoFocus
                        />
                      )}
                    </div>

                    {/* Elasticsearch Analysis Preview */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                        🔍 Elasticsearch Analiz Sonuçları
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                            Anahtar Kelimeler:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {elasticSuggestions.keywords
                              .slice(0, 6)
                              .map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-full text-sm border border-blue-200 dark:border-blue-700"
                                >
                                  {keyword}
                                </span>
                              ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                            Duygu Analizi:
                          </h4>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-3">
                              <div
                                className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2.5 rounded-full"
                                style={{
                                  width: `${
                                    ((elasticSuggestions.sentiment + 1) / 2) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {elasticSuggestions.sentiment > 0.3
                                ? "😊 Pozitif"
                                : elasticSuggestions.sentiment < -0.3
                                  ? "😔 Negatif"
                                  : "😐 Nötr"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                        disabled={isSaving}
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleSaveNote}
                        disabled={isSaving || !editContent.trim()}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
                      >
                        {isSaving ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Elasticsearch'e Kaydediliyor...
                          </>
                        ) : (
                          "📝 Elasticsearch'e Kaydet"
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* View Mode */}
                  <div className="p-8">
                    {/* Keywords */}
                    {note.keywords && note.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {note.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <div className="prose max-w-none mb-8">
                      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-lg leading-relaxed">
                        {note.content}
                      </div>
                    </div>

                    {/* Summary */}
                    {note.summary && (
                      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          📋 Elasticsearch Özeti
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {note.summary}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar - Sağ (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {showAIRequestPanel && aiSuggestions && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">
                    🤖 Yeni AI Önerileri
                  </h3>
                  <button
                    onClick={() => setShowAIRequestPanel(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    × Kapat
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Başlık Önerisi:
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border">
                      <span className="text-sm">
                        {aiSuggestions.suggestedTitle}
                      </span>
                      <button
                        onClick={() => applyAISuggestion("title")}
                        className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                      >
                        Uygula
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Özet Önerisi:
                    </div>
                    <div className="p-2 bg-white dark:bg-gray-700 rounded border">
                      <p className="text-sm mb-2">
                        {aiSuggestions.suggestedSummary}
                      </p>
                      <button
                        onClick={() => applyAISuggestion("summary")}
                        className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                      >
                        Uygula
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <button
                      onClick={() => applyAISuggestion("both")}
                      className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-700 hover:to-pink-700"
                    >
                      Hepsini Uygula
                    </button>
                    <div className="text-xs text-gray-500">
                      {aiSuggestions.language === "tr"
                        ? "🇹🇷 Türkçe"
                        : "🇬🇧 English"}{" "}
                      • {aiSuggestions.wordCount} kelime
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Elasticsearch Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center text-lg">
                <span className="text-blue-700 dark:text-blue-400 mr-2">
                  🔍
                </span>
                Elasticsearch Bilgileri
              </h3>
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Not ID
                  </div>
                  <div className="font-mono text-sm bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 break-all">
                    {note.id}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    User ID
                  </div>
                  <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-300 truncate">
                    {note.userId}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Dil
                  </div>
                  <div className="flex items-center">
                    <span className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300 rounded-lg text-sm font-semibold border border-green-200 dark:border-green-800">
                      {note.metadata?.language === "tr"
                        ? "🇹🇷 Türkçe"
                        : note.metadata?.language || "Unknown"}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Elasticsearch Durumu
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-600 rounded-full mr-3 animate-pulse"></div>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-300">
                      Indexed & Searchable
                    </span>
                  </div>
                </div>
              </div>
              {note.metadata?.aiMetadata && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    AI Metadata
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700 dark:text-gray-400">
                      <span className="font-medium">Dil:</span>{" "}
                      {note.metadata.aiMetadata.aiLanguage === "tr"
                        ? "🇹🇷 Türkçe"
                        : "🇬🇧 English"}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-400">
                      <span className="font-medium">Kelime:</span>{" "}
                      {note.metadata.aiMetadata.aiWordCount}
                    </div>
                    {note.metadata.aiMetadata.userEdited && (
                      <div className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                        ✏️ Kullanıcı tarafından düzenlendi
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">
                ⚡ Hızlı İşlemler
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors font-medium flex items-center justify-center"
                >
                  {isEditing
                    ? "📄 Görüntüleme Moduna Dön"
                    : "✏️ Düzenleme Moduna Geç"}
                </button>

                <Link
                  href={`/notes/${noteId}/edit`}
                  className="block w-full px-4 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors font-medium text-center"
                >
                  🚀 Tam Ekran Düzenle
                </Link>

                <button
                  onClick={handleExtendExpire}
                  className="w-full px-4 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors font-medium flex items-center justify-center"
                >
                  ⏰ {isExpired ? "Aktif Et" : "3 Ay Daha Uzat"}
                </button>

                <button
                  onClick={handleDeleteNote}
                  className="w-full px-4 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors font-medium flex items-center justify-center"
                >
                  🗑️ Notu Sil
                </button>
              </div>
            </div>
            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">
                📊 İstatistikler
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {note.metadata?.wordCount || 0}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      Kelime
                    </div>
                  </div>

                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {note.keywords?.length || 0}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-300 mt-1">
                      Anahtar Kelime
                    </div>
                  </div>
                </div>

                {note.metadata?.sentiment !== undefined && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-400">
                        Duygu Analizi
                      </div>
                      <div className="text-lg">
                        {note.metadata.sentiment > 0.3
                          ? "😊"
                          : note.metadata.sentiment < -0.3
                            ? "😔"
                            : "😐"}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                        style={{
                          width: `${
                            ((note.metadata.sentiment + 1) / 2) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Son Güncelleme
                  </div>
                  <div className="font-medium text-gray-900 dark:text-gray-300">
                    {formatDate(note.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
