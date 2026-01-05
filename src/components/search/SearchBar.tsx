"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  initialQuery?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  onSearch,
  initialQuery = "",
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim());
      } else {
        router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setQuery("");
      onSearch?.("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`relative transition-all duration-200 ${
          isFocused ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Notlarınızda arama yapın... (Elasticsearch gücüyle)"
          className="w-full pl-12 pr-10 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:border-blue-500 text-gray-700 placeholder-gray-400"
          autoFocus={autoFocus}
        />

        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
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
          </svg>
        </div>

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onSearch?.("");
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 hidden sm:block">
          ⏎ Enter
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <span>📝 Elasticsearch ile tam metin arama</span>
        <button
          type="button"
          onClick={() => router.push("/dashboard/search")}
          className="text-blue-600 hover:text-blue-800 text-xs"
        >
          Gelişmiş Arama →
        </button>
      </div>
    </form>
  );
}
