"use client";

import { useAuth } from "@/lib/auth";
import { Note, noteAPI } from "@/lib/elasticsearch-client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface NoteListProps {
  searchQuery?: string;
}

// Infinite scroll için kullanılacak hook
const useInfiniteScroll = (callback: () => void) => {
  const observerRef = useRef<IntersectionObserver>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback]);

  return loadMoreRef;
};

export default function NoteList({ searchQuery = "" }: NoteListProps) {
  const { user } = useAuth();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Infinite scroll için query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["notes", user?.id, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      if (!user) return { notes: [], total: 0, page: 1, pageSize: 10 };

      if (searchQuery) {
        return await noteAPI.searchNotes(user.id, searchQuery, pageParam, 10);
      } else {
        return await noteAPI.getNotes(user.id, pageParam, 10);
      }
    },
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!user,
  });

  // Infinite scroll için callback
  const loadMoreRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });

  // Notları düzleştirilmiş bir array olarak al
  const allNotes = data?.pages.flatMap((page) => page.notes) || [];

  // Not tıklama işlemi
  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsDetailViewOpen(true);
  };

  // Not silme
  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (
      !confirm(
        "Bu notu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      )
    ) {
      return;
    }

    try {
      await noteAPI.deleteNote(noteId);
      toast.success("Not başarıyla silindi!");
      refetch();
    } catch (error) {
      console.error("Not silme hatası:", error);
      toast.error("Not silinirken bir hata oluştu.");
    }
  };

  // Not düzenleme sayfasına yönlendirme
  const handleEditNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/notes/${noteId}`;
  };

  // Format tarih
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: tr,
    });
  };

  // Expire durumu kontrolü
  const getExpireStatus = (expiresAt: string, isExpired: boolean) => {
    if (isExpired) {
      return {
        text: "Süresi Doldu",
        color: "bg-red-100 text-red-800 border border-red-200",
        icon: "⏰",
      };
    }

    const daysLeft = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft <= 0) {
      return {
        text: "Bugün Doluyor",
        color: "bg-red-100 text-red-800 border border-red-200",
        icon: "⚠️",
      };
    }
    if (daysLeft <= 3) {
      return {
        text: `${daysLeft} gün kaldı`,
        color: "bg-yellow-100 text-yellow-800 border border-yellow-200",
        icon: "⏳",
      };
    }
    if (daysLeft <= 7) {
      return {
        text: `${daysLeft} gün kaldı`,
        color: "bg-blue-100 text-blue-800 border border-blue-200",
        icon: "📅",
      };
    }

    return {
      text: `${daysLeft} gün kaldı`,
      color: "bg-green-100 text-green-800 border border-green-200",
      icon: "✅",
    };
  };

  // Relevance score'dan yıldız oluştur
  const renderRelevanceStars = (score?: number) => {
    if (!score || score < 0.1) return null;

    const normalizedScore = Math.min(Math.max(score / 5, 0), 1);
    const stars = Math.ceil(normalizedScore * 5);

    return (
      <div
        className="flex items-center"
        title={`Relevance score: ${score.toFixed(2)}`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`text-sm ${
              i < stars ? "text-yellow-500" : "text-gray-300"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Highlight edilmiş içeriği render et
  const renderHighlightedContent = (note: Note) => {
    // @ts-ignore - note._highlight geçici olarak ekliyoruz
    const highlight = note._highlight;

    if (highlight?.content?.length > 0) {
      return (
        <div className="mt-2">
          {highlight.content.map((fragment: string, index: number) => (
            <p
              key={index}
              className="text-sm text-gray-600 mb-1"
              dangerouslySetInnerHTML={{ __html: fragment }}
            />
          ))}
        </div>
      );
    }

    // Highlight yoksa özeti göster
    return (
      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
        {note.summary || note.content.substring(0, 150)}...
      </p>
    );
  };

  // Loading state
  if (isLoading && !allNotes.length) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <div className="text-red-600 text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Notlar yüklenemedi
        </h3>
        <p className="text-red-600 mb-6">
          Elasticsearch bağlantısında bir sorun olabilir.
        </p>
        <button
          onClick={() => refetch()}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && allNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-6">📝</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {searchQuery
            ? `"${searchQuery}" için sonuç bulunamadı`
            : "Henüz notunuz yok"}
        </h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          {searchQuery
            ? "Farklı anahtar kelimelerle arama yapmayı deneyin veya Elasticsearch'in fuzziness özelliğinden faydalanın."
            : "İlk notunuzu oluşturarak Elasticsearch'in otomatik başlık ve özet özelliklerini deneyimleyin!"}
        </p>
        {!searchQuery && (
          <a
            href="/notes/create"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Yeni Not Oluştur
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {searchQuery
                ? `"${searchQuery}" Arama Sonuçları`
                : "Tüm Notlarım"}
            </h2>
            <p className="text-sm text-gray-600">
              {allNotes.length} not • Elasticsearch ile sıralanmıştır
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {data?.pages[0]?.total && (
                <>
                  Toplam{" "}
                  <span className="font-semibold">{data.pages[0].total}</span>{" "}
                  not
                </>
              )}
            </div>

            <button
              onClick={() => refetch()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Yenile"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Notes List */}
        {allNotes.map((note, index) => {
          const expireStatus = getExpireStatus(note.expiresAt, note.isExpired);
          const isSelected = selectedNote?.id === note.id;

          return (
            <div
              key={`${note.id}-${index}`}
              className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer group ${
                isSelected
                  ? "ring-2 ring-blue-500 border-blue-300"
                  : "border-gray-200"
              }`}
              onClick={() => handleNoteClick(note)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
                        {note.title}
                      </h3>

                      {/* Relevance Score */}
                      {renderRelevanceStars(note.relevanceScore)}
                    </div>

                    {/* Tags and Status */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {/* Keywords/Tags */}
                      {note.keywords && note.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.keywords.slice(0, 3).map((keyword, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              {keyword}
                            </span>
                          ))}
                          {note.keywords.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500">
                              +{note.keywords.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expire Status */}
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${expireStatus.color}`}
                      >
                        <span className="mr-1">{expireStatus.icon}</span>
                        {expireStatus.text}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button
                      onClick={(e) => handleEditNote(note._id, e)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Content Preview */}
                {renderHighlightedContent(note)}

                {/* Footer */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formatDate(note.createdAt)}
                    </div>

                    <div className="flex items-center text-sm text-gray-500">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      {note.metadata?.wordCount || 0} kelime
                    </div>

                    {note.metadata?.sentiment !== undefined && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {note.metadata.sentiment > 0.3
                          ? "😊 Pozitif"
                          : note.metadata.sentiment < -0.3
                          ? "😔 Negatif"
                          : "😐 Nötr"}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400">
                    ID: {note.id.substring(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Load More Trigger */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="py-8 text-center">
            {isFetchingNextPage ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <button
                onClick={() => fetchNextPage()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Daha fazla yükle
              </button>
            )}
          </div>
        )}

        {/* End of list */}
        {!hasNextPage && allNotes.length > 0 && (
          <div className="py-8 text-center border-t border-gray-200">
            <p className="text-gray-500">
              🎉 Tüm notlarınızı görüntülüyorsunuz! ({allNotes.length} not)
            </p>
          </div>
        )}
      </div>

      {/* Note Detail Modal */}
      {isDetailViewOpen && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{selectedNote.title}</h2>
                  <p className="text-blue-100 mt-1">
                    {formatDate(selectedNote.createdAt)} •{" "}
                    {selectedNote.metadata?.wordCount || 0} kelime
                  </p>
                </div>
                <button
                  onClick={() => setIsDetailViewOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto max-h-[60vh]">
              {/* Keywords */}
              {selectedNote.keywords && selectedNote.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedNote.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}

              {/* Summary */}
              {selectedNote.summary && (
                <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    📋 Elasticsearch Özeti
                  </h4>
                  <p className="text-gray-600">{selectedNote.summary}</p>
                </div>
              )}

              {/* Content */}
              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  İçerik
                </h3>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {selectedNote.content}
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">
                  📊 Not Bilgileri
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Oluşturulma</div>
                    <div className="font-medium">
                      {new Date(selectedNote.createdAt).toLocaleDateString(
                        "tr-TR"
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Expire Tarihi</div>
                    <div className="font-medium">
                      {new Date(selectedNote.expiresAt).toLocaleDateString(
                        "tr-TR"
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Kelime Sayısı</div>
                    <div className="font-medium">
                      {selectedNote.metadata?.wordCount || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Duygu Analizi</div>
                    <div className="font-medium">
                      {selectedNote.metadata?.sentiment !== undefined &&
                        (selectedNote.metadata.sentiment > 0.3
                          ? "😊 Pozitif"
                          : selectedNote.metadata.sentiment < -0.3
                          ? "😔 Negatif"
                          : "😐 Nötr")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsDetailViewOpen(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Kapat
                </button>
                <button
                  onClick={(e) => {
                    handleEditNote(selectedNote._id, e);
                    setIsDetailViewOpen(false);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
                >
                  <svg
                    className="w-5 h-5 inline mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Notu Düzenle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
