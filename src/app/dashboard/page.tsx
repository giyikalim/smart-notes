"use client";

import UserMenu from "@/components/auth/UserMenu";
import QuickStats from "@/components/dashboard/QuickStats";
import NoteList from "@/components/notes/NoteList";
import AdvancedSearchModal from "@/components/search/AdvancedSearchModal";
import AdvancedSearchResults from "@/components/search/AdvancedSearchResults";
import SearchBar from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useProtectedRoute } from "@/lib/auth";
import { Note, noteAPI } from "@/lib/elasticsearch-client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const { user, isLoading } = useProtectedRoute();
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false); // Yeni state
  const searchInputRef = useRef<HTMLInputElement>(null); // Ref ekleyin

  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q");

  const [searchQuery, setSearchQuery] = useState(urlQuery || "");

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedSearchData, setAdvancedSearchData] = useState<{
    notes: Note[];
    total: number;
    aggregations: any;
    searchParams: any;
  } | null>(null);

  const [showAdvancedResults, setShowAdvancedResults] = useState(false);

  useEffect(() => {
    if (urlQuery) {
      setSearchQuery(urlQuery);
      // URL'den query geldiyse de focus et
      setShouldFocusSearch(true);
    }
  }, [urlQuery]);

  const handleAdvancedSearch = async (filters: any) => {
    try {
      const result = await noteAPI.advancedSearch(filters);

      setAdvancedSearchData({
        notes: result.notes,
        total: result.total,
        aggregations: result.aggregations,
        searchParams: filters,
      });

      setShowAdvancedResults(true);
    } catch (error) {
      console.error("Advanced search error:", error);
    }
  };

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchData(null);
    setShowAdvancedResults(false);
  };

  useEffect(() => {
    // Sayfa ilk yüklendiğinde search bar'ı focus et
    if (!isLoading && user) {
      // Kısa bir gecikme ekleyelim ki sayfa tam yüklensin
      const timer = setTimeout(() => {
        setShouldFocusSearch(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  // DashboardPage bileşenine useEffect ekleyin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K veya Cmd+K ile search bar'a focus
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Slash (/) ile de focus et
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // ESC ile focus'tan çık (eğer search bar boşsa)
      if (
        e.key === "Escape" &&
        searchInputRef.current === document.activeElement &&
        !searchQuery
      ) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  useEffect(() => {
    if (shouldFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      // Focus olduktan sonra state'i sıfırla
      setShouldFocusSearch(false);
    }
  }, [shouldFocusSearch]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-primary-foreground"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 dark:from-gray-900 dark:to-gray-800/30">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-600 dark:from-primary-foreground dark:to-indigo-400 bg-clip-text text-transparent">
                  📚 Elastic Notes
                </h1>
                <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                  Elasticsearch ile akıllı not organizasyonu
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-full sm:w-96">
              <SearchBar
                onSearch={setSearchQuery}
                autoFocus={true}
                ref={searchInputRef}
                openAdvanceSearchModal={() => setIsAdvancedSearchOpen(true)}
              />
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Quick Stats */}
          <div className="lg:col-span-1">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Hızlı Eylemler
              </h3>
              <div className="space-y-3">
                <Link
                  href="/notes/create"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 dark:from-blue-700 dark:to-primary text-white text-center rounded-lg hover:from-primary/90 hover:to-blue-700 dark:hover:from-blue-800 dark:hover:to-primary/90 transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  + Yeni Not Oluştur
                </Link>

                <button
                  onClick={() => setIsAdvancedSearchOpen(true)}
                  className="block w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 text-white text-center rounded-lg hover:from-purple-600 hover:to-indigo-700 dark:hover:from-purple-700 dark:hover:to-indigo-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
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
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 11h4m-2 2v-4"
                        />
                      </svg>
                    </div>
                    <span>Gelişmiş Arama</span>
                  </div>
                </button>

                <Link
                  href="/discover"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 text-white text-center rounded-lg hover:from-amber-600 hover:to-orange-600 dark:hover:from-amber-700 dark:hover:to-orange-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  <span className="inline-block mr-2">🚀</span>
                  Keşfet
                </Link>
              </div>
            </div>
            <QuickStats userId={user.id} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              {showAdvancedResults && (
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        🎯 Gelişmiş Arama Sonuçları
                      </h2>

                      {showAdvancedResults && advancedSearchData && (
                        <button
                          onClick={handleClearAdvancedSearch}
                          className="px-3 py-1 text-sm bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all"
                        >
                          ❌ Temizle
                        </button>
                      )}
                    </div>

                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {`${advancedSearchData?.total || 0} not filtrelendi`}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6">
                {showAdvancedResults && advancedSearchData ? (
                  <AdvancedSearchResults
                    notes={advancedSearchData.notes}
                    total={advancedSearchData.total}
                    aggregations={advancedSearchData.aggregations}
                    searchParams={advancedSearchData.searchParams}
                  />
                ) : (
                  <NoteList searchQuery={searchQuery} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {user && (
        <AdvancedSearchModal
          isOpen={isAdvancedSearchOpen}
          onClose={() => setIsAdvancedSearchOpen(false)}
          onSearch={handleAdvancedSearch}
          userId={user.id}
        />
      )}
    </div>
  );
}
