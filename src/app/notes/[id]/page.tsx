"use client";

import { useAuth } from "@/lib/auth";
import { noteAPI } from "@/lib/elasticsearch-client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function NoteDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
    titleSuggestions: string[];
  }>({
    keywords: [],
    sentiment: 0,
    titleSuggestions: [],
  });

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

      // Başlık önerileri
      const sentences = content.split(/[.!?]+/);
      const titleSuggestions = sentences
        .slice(0, 3)
        .map((s) => s.trim().substring(0, 50) + (s.length > 50 ? "..." : ""))
        .filter((s) => s.length > 10);

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
        titleSuggestions:
          titleSuggestions.length > 0
            ? titleSuggestions
            : [note?.title || "Yeni Not"],
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
      const updates = {
        content: editContent,
        title: editTitle || elasticSuggestions.titleSuggestions[0],
        keywords: elasticSuggestions.keywords.slice(0, 8),
        summary: await generateSummary(editContent),
        metadata: {
          wordCount: editContent.split(/\s+/).filter((w) => w.length > 0)
            .length,
          language: "tr",
          sentiment: elasticSuggestions.sentiment,
          lastEdited: new Date().toISOString(),
        },
      };

      await noteAPI.updateNote(noteId, updates);
      toast.success("Not Elasticsearch'e kaydedildi!");
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

      await noteAPI.updateNote(noteId, {
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
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-blue-600 dark:focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        placeholder="Not başlığı..."
                      />
                    </div>

                    {/* Elasticsearch Title Suggestions */}
                    {elasticSuggestions.titleSuggestions.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          🤖 Elasticsearch Başlık Önerileri:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {elasticSuggestions.titleSuggestions.map(
                            (suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setEditTitle(suggestion)}
                                className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                              >
                                {suggestion}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
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
