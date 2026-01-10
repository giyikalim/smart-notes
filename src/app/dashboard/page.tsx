"use client";

import UserMenu from "@/components/auth/UserMenu";
import QuickStats from "@/components/dashboard/QuickStats";
import NoteList from "@/components/notes/NoteList";
import SearchBar from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useProtectedRoute } from "@/lib/auth";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const { user, isLoading } = useProtectedRoute();
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false); // Yeni state
  const searchInputRef = useRef<HTMLInputElement>(null); // Ref ekleyin

  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q");

  const [searchQuery, setSearchQuery] = useState(urlQuery || "");

  useEffect(() => {
    if (urlQuery) {
      setSearchQuery(urlQuery);
      // URL'den query geldiyse de focus et
      setShouldFocusSearch(true);
    }
  }, [urlQuery]);

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
            <QuickStats userId={user.id} />

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-6 mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Hızlı Eylemler
              </h3>
              <div className="space-y-3">
                <a
                  href="/notes/create"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 dark:from-primary dark:to-blue-500 text-white text-center rounded-lg hover:from-primary/90 hover:to-blue-700 dark:hover:from-primary/90 dark:hover:to-blue-600 transition-all font-medium shadow-sm hover:shadow-md"
                >
                  + Yeni Not Oluştur
                </a>
                <button className="block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                  🗂️ Tüm Notlarım
                </button>
                <button className="block w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                  🔍 Gelişmiş Arama
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {searchQuery
                      ? `"${searchQuery}" için sonuçlar`
                      : "Son Notlarım"}
                  </h2>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Elasticsearch ile sıralanmıştır
                  </span>
                </div>
              </div>

              <div className="p-6">
                <NoteList searchQuery={searchQuery} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
