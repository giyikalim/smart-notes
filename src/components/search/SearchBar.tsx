"use client";

import { useRouter } from "next/navigation";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  initialQuery?: string;
  autoFocus?: boolean;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    { onSearch, initialQuery = "", autoFocus = false }: SearchBarProps,
    ref
  ) {
    const [query, setQuery] = useState(initialQuery);
    const [isFocused, setIsFocused] = useState(false);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        if (onSearch) {
          onSearch(query.trim());
        } else {
          router.push(
            `/dashboard/search?q=${encodeURIComponent(query.trim())}`
          );
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuery("");
        onSearch?.("");
        inputRef.current?.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={(e) => {
              setIsFocused(true);
              e.target.select();
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Notlarınızda arama yapın... (Ctrl+K ile focus)"
            className="w-full pl-12 pr-10 py-3 bg-white dark:bg-gray-900 
                       border border-gray-300 dark:border-gray-700 
                       rounded-xl shadow-sm
                       
                       /* Text styling */
                       text-gray-700 dark:text-gray-300 
                       placeholder-gray-400 dark:placeholder-gray-500
                       
                       /* Focus styling - rounded kalacak şekilde */
                       focus:outline-none 
                       focus:border-2 focus:border-blue-500 dark:focus:border-blue-400
                       focus:shadow-lg focus:shadow-blue-500/20 dark:focus:shadow-blue-400/20
                       
                       /* Hover effect */
                       hover:border-gray-400 dark:hover:border-gray-600
                       
                       /* Smooth transitions */
                       transition-all duration-200"
            autoFocus={autoFocus}
          />

          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
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
                inputRef.current?.focus();
              }}
              className="absolute right-10 top-1/2 transform -translate-y-1/2 
                         text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                         transition-colors"
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

          <div
            className="absolute right-3 top-1/2 transform -translate-y-1/2 
                          text-xs text-gray-500 dark:text-gray-400 hidden sm:block"
          >
            ⏎
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>📝 Elasticsearch ile tam metin arama</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              Ctrl+K
            </span>
            <button
              type="button"
              onClick={() => router.push("/dashboard/search")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
            >
              Gelişmiş Arama →
            </button>
          </div>
        </div>
      </form>
    );
  }
);

export default SearchBar;
