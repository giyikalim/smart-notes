// app/discover/page.tsx
"use client";

import { useAuth } from "@/lib/auth";
import { Note, noteAPI } from "@/lib/elasticsearch-client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DiscoverPage() {
  const { user } = useAuth();
  const [discoveryNotes, setDiscoveryNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [similarNotes, setSimilarNotes] = useState<Note[]>([]);

  const loadSimilarNotes = async (noteId: string) => {
    const similar = await noteAPI.findSimilarNotes(noteId, user.id, 6);
    setSimilarNotes(similar);
  };

  const loadDiscoveryNotes = async () => {
    const notes = await noteAPI.getNotes(user.id, 1, 20);
    setDiscoveryNotes(notes.notes);
    if (notes.notes.length > 0 && notes.notes[0]?._id) {
      setSelectedNote(notes.notes[0]);
      loadSimilarNotes(notes.notes[0]._id);
    }
  };

  // Kullanıcının notlarından en popüler olanı seç
  useEffect(() => {
    if (user) {
      loadDiscoveryNotes();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-900/20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Notlarınızı Keşfedin
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Benzer notlarınızı görün ve yeni bağlantılar keşfedin
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol: Not seçimi */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Notlarınız
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {discoveryNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      if (note?._id) {
                        setSelectedNote(note);
                        loadSimilarNotes(note._id);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedNote?.id === note.id
                        ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800"
                        : "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {note.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {note.keywords.slice(0, 3).join(", ")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orta: Seçilen not */}
          {selectedNote && (
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {selectedNote.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {selectedNote.summary}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedNote.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Benzer notlar grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {similarNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">
                        {note.title}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                        %{Math.round((note.similarityScore || 0) * 100)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {note.summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/notes/${note.id}`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
                      >
                        Görüntüle →
                      </Link>
                      <span className="text-xs text-gray-500">
                        {note.metadata.wordCount} kelime
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
