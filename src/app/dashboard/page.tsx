"use client";

import UserMenu from "@/components/auth/UserMenu";
import QuickStats from "@/components/dashboard/QuickStats";
import NoteList from "@/components/notes/NoteList";
import SearchBar from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useProtectedRoute } from "@/lib/auth";
import { useState } from "react";

export default function DashboardPage() {
  const { user, isLoading } = useProtectedRoute();
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                  📚 Elastic Notes
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Elasticsearch ile akıllı not organizasyonu
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-full sm:w-96">
              <SearchBar onSearch={setSearchQuery} />
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
            <div className="bg-card rounded-xl border shadow-sm p-6 mt-6">
              <h3 className="font-semibold text-foreground mb-4">
                Hızlı Eylemler
              </h3>
              <div className="space-y-3">
                <a
                  href="/notes/create"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground text-center rounded-lg hover:from-primary/90 hover:to-blue-700 transition-all font-medium"
                >
                  + Yeni Not Oluştur
                </a>
                <button className="block w-full px-4 py-3 bg-secondary text-secondary-foreground text-center rounded-lg hover:bg-secondary/80 transition-colors">
                  🗂️ Tüm Notlarım
                </button>
                <button className="block w-full px-4 py-3 bg-secondary text-secondary-foreground text-center rounded-lg hover:bg-secondary/80 transition-colors">
                  🔍 Gelişmiş Arama
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-foreground">
                    {searchQuery
                      ? `"${searchQuery}" için sonuçlar`
                      : "Son Notlarım"}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    Elasticsearch ile sıralanmıştır
                  </span>
                </div>
              </div>

              <div className="p-6">
                <NoteList userId={user.id} searchQuery={searchQuery} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
