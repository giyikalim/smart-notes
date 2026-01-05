"use client";

import UserMenu from "@/components/auth/UserMenu";
import QuickStats from "@/components/dashboard/QuickStats";
import NoteList from "@/components/notes/NoteList";
import SearchBar from "@/components/search/SearchBar";
import { useProtectedRoute } from "@/lib/auth";
import { useState } from "react";

export default function DashboardPage() {
  const { user, isLoading } = useProtectedRoute();
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  📚 Elastic Notes
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Elasticsearch ile akıllı not organizasyonu
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-full sm:w-96">
              <SearchBar onSearch={setSearchQuery} />
            </div>

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Quick Stats */}
          <div className="lg:col-span-1">
            <QuickStats userId={user.id} />

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                Hızlı Eylemler
              </h3>
              <div className="space-y-3">
                <a
                  href="/notes/create"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium"
                >
                  + Yeni Not Oluştur
                </a>
                <button className="block w-full px-4 py-3 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 transition-colors">
                  🗂️ Tüm Notlarım
                </button>
                <button className="block w-full px-4 py-3 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 transition-colors">
                  🔍 Gelişmiş Arama
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {searchQuery
                      ? `"${searchQuery}" için sonuçlar`
                      : "Son Notlarım"}
                  </h2>
                  <span className="text-sm text-gray-500">
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
