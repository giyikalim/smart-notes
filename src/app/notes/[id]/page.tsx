"use client";

import { useAuth } from "@/lib/auth";
import { noteAPI } from "@/lib/elasticsearch-client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function NoteDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  // Not verilerini getir
  const { data: note, status } = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      return await noteAPI.getNoteById(noteId);
    },
    enabled: !!noteId && !!user,
  });

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
                {note.title}
              </h1>
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
                      📋 Özet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {note.summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Sağ (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">
                ⚡ Hızlı İşlemler
              </h3>

              <div className="space-y-3">
                <Link
                  href={`/notes/${noteId}/edit`}
                  className="block w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all font-medium text-center shadow-sm hover:shadow-md"
                >
                  ✏️ Düzenle
                </Link>

                <button
                  onClick={handleDeleteNote}
                  className="w-full px-4 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors font-medium"
                >
                  🗑️ Notu Sil
                </button>
              </div>
            </div>

            {/* Elasticsearch Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center text-lg">
                <span className="text-blue-700 dark:text-blue-400 mr-2">
                  🔍
                </span>
                Teknik Bilgiler
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
                    AI Bilgileri
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
                    {formatDate(
                      note.metadata?.lastEdited ||
                        note.updatedAt ||
                        note.createdAt
                    )}
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
