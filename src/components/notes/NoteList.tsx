"use client";

import { useAuth } from "@/lib/auth";
import { Note, noteAPI } from "@/lib/elasticsearch-client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Edit,
  FileText,
  Frown,
  Info,
  Meh,
  Plus,
  RefreshCw,
  Smile,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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
    router.push(`/notes/${note._id}`);
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
    router.push(`/notes/${noteId}/edit`);
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
        icon: <Clock className="w-3 h-3 mr-1" />,
      };
    }

    const daysLeft = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft <= 0) {
      return {
        text: "Bugün Doluyor",
        color: "bg-red-100 text-red-800 border border-red-200",
        icon: <AlertTriangle className="w-3 h-3 mr-1" />,
      };
    }
    if (daysLeft <= 3) {
      return {
        text: `${daysLeft} gün kaldı`,
        color: "bg-yellow-100 text-yellow-800 border border-yellow-200",
        icon: <Clock className="w-3 h-3 mr-1" />,
      };
    }
    if (daysLeft <= 7) {
      return {
        text: `${daysLeft} gün kaldı`,
        color: "bg-blue-100 text-blue-800 border border-blue-200",
        icon: <Calendar className="w-3 h-3 mr-1" />,
      };
    }

    return {
      text: `${daysLeft} gün kaldı`,
      color: "bg-green-100 text-green-800 border border-green-200",
      icon: <Check className="w-3 h-3 mr-1" />,
    };
  };

  // Duygu durumu icon'u
  const getSentimentIcon = (sentiment?: number) => {
    if (sentiment === undefined) return null;

    if (sentiment > 0.3) {
      return <Smile className="w-4 h-4 mr-1 text-green-600" />;
    } else if (sentiment < -0.3) {
      return <Frown className="w-4 h-4 mr-1 text-red-600" />;
    } else {
      return <Meh className="w-4 h-4 mr-1 text-yellow-600" />;
    }
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
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < stars
                ? "fill-yellow-500 text-yellow-500"
                : "fill-gray-200 text-gray-300"
            }`}
          />
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
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Notlar yüklenemedi
        </h3>
        <p className="text-red-600 mb-6">
          Elasticsearch bağlantısında bir sorun olabilir.
        </p>
        <button
          onClick={() => refetch()}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center mx-auto"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Tekrar Dene
        </button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && allNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-6" />
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
            <Plus className="w-5 h-5 mr-2" />
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
            <p className="text-sm text-gray-600 flex items-center">
              <FileText className="w-4 h-4 mr-1" />
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
              <RefreshCw className="w-5 h-5" />
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
                              <Tag className="w-3 h-3 mr-1" />
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
                        {expireStatus.icon}
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
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content Preview */}
                {renderHighlightedContent(note)}

                {/* Footer */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(note.createdAt)}
                    </div>

                    <div className="flex items-center text-sm text-gray-500">
                      <FileText className="w-4 h-4 mr-1" />
                      {note.metadata?.wordCount || 0} kelime
                    </div>

                    {note.metadata?.sentiment !== undefined && (
                      <div className="flex items-center text-sm text-gray-500">
                        {getSentimentIcon(note.metadata.sentiment)}
                        {note.metadata.sentiment > 0.3
                          ? "Pozitif"
                          : note.metadata.sentiment < -0.3
                            ? "Negatif"
                            : "Nötr"}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 flex items-center">
                    <Info className="w-3 h-3 mr-1" />
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">
                  <RefreshCw className="w-4 h-4 m-auto mt-2" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => fetchNextPage()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center mx-auto"
              >
                <ChevronDown className="w-5 h-5 mr-2" />
                Daha fazla yükle
              </button>
            )}
          </div>
        )}

        {/* End of list */}
        {!hasNextPage && allNotes.length > 0 && (
          <div className="py-8 text-center border-t border-gray-200">
            <p className="text-gray-500 flex items-center justify-center">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              🎉 Tüm notlarınızı görüntülüyorsunuz! ({allNotes.length} not)
            </p>
          </div>
        )}
      </div>
    </>
  );
}
