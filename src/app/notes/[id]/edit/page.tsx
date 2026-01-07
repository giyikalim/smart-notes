"use client";

import { useAuth } from "@/lib/auth";
import { noteAPI } from "@/lib/elasticsearch-client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function FullscreenEditPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [wordCount, setWordCount] = useState(0);

  // Not verilerini getir
  const { data: note, isLoading } = useQuery({
    queryKey: ["note", noteId],
    queryFn: () => noteAPI.getNoteById(noteId),
    enabled: !!noteId && !!user,
  });

  // İlk yükleme
  useEffect(() => {
    if (note) {
      setContent(note.content);
      setTitle(note.title);
      setKeywords(note.keywords || []);
      setWordCount(
        note.content.split(/\s+/).filter((w) => w.length > 0).length
      );
    }
  }, [note]);

  // Kelime sayısını güncelle
  useEffect(() => {
    setWordCount(content.split(/\s+/).filter((w) => w.length > 0).length);
  }, [content]);

  // Elasticsearch analizi
  const [elasticAnalysis, setElasticAnalysis] = useState({
    suggestedTitle: "",
    suggestedKeywords: [] as string[],
    sentiment: 0,
    readabilityScore: 0,
  });

  // İçerik değiştiğinde analiz yap
  useEffect(() => {
    if (content.length > 50) {
      analyzeContent();
    }
  }, [content]);

  const analyzeContent = () => {
    // Başlık önerisi (ilk cümle)
    const firstSentence = content.split(/[.!?]+/)[0];
    const suggestedTitle =
      firstSentence.length > 60
        ? firstSentence.substring(0, 60) + "..."
        : firstSentence;

    // Anahtar kelimeler
    const words = content
      .toLowerCase()
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const wordFrequency: Record<string, number> = {};
    words.forEach((word) => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    const suggestedKeywords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word);

    setElasticAnalysis({
      suggestedTitle,
      suggestedKeywords,
      sentiment: 0, // Gerçek uygulamada Elasticsearch API'si kullanılır
      readabilityScore: Math.min(100, Math.max(0, 100 - content.length / 100)),
    });
  };

  // Notu kaydet
  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Lütfen not içeriği girin");
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        content,
        title: title || elasticAnalysis.suggestedTitle || "Yeni Not",
        keywords: [
          ...new Set([...keywords, ...elasticAnalysis.suggestedKeywords]),
        ].slice(0, 10),
        metadata: {
          wordCount,
          language: "tr",
          lastEdited: new Date().toISOString(),
        },
      };

      await noteAPI.updateNote(noteId, updates);
      toast.success("Not Elasticsearch'e kaydedildi!");
      router.push(`/notes/${noteId}`);
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      toast.error("Not kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  // Vazgeç
  const handleCancel = () => {
    if (
      content !== note?.content &&
      !confirm(
        "Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?"
      )
    ) {
      return;
    }
    router.push(`/notes/${noteId}`);
  };

  // Kısayol tuşları
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleCancel]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                ← Geri Dön
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>{wordCount} kelime</span>
                <span className="text-gray-600">•</span>
                <span>{content.length} karakter</span>
              </div>

              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                {showAnalysis ? "📊 Analizi Gizle" : "📊 Analizi Göster"}
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg font-medium disabled:opacity-50 transition-all"
              >
                {isSaving ? "Kaydediliyor..." : "💾 Elasticsearch'e Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Editor - Sol */}
        <div className="flex-1 overflow-hidden">
          <div className="p-6 h-full">
            <div className="mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Not başlığı (boş bırakırsanız Elasticsearch otomatik oluşturacak)"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-semibold"
              />
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Notunuzu buraya yazın... (Ctrl+S: Kaydet, Esc: Çık)"
              className="w-full h-[calc(100%-4rem)] px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-lg"
              autoFocus
            />
          </div>
        </div>

        {/* Analysis Panel - Sağ */}
        {showAnalysis && (
          <div className="w-96 border-l border-gray-700 overflow-y-auto bg-gray-800">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6 text-blue-400">
                🔍 Elasticsearch Analiz Paneli
              </h2>

              {/* Title Suggestions */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Başlık Önerileri
                </h3>
                <div className="space-y-2">
                  {elasticAnalysis.suggestedTitle && (
                    <button
                      onClick={() => setTitle(elasticAnalysis.suggestedTitle)}
                      className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <div className="text-sm text-gray-400 mb-1">Önerilen</div>
                      <div className="font-medium">
                        {elasticAnalysis.suggestedTitle}
                      </div>
                    </button>
                  )}

                  {title && (
                    <div className="p-3 bg-gray-700 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Mevcut</div>
                      <div className="font-medium">{title}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Keywords */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-400">
                    Anahtar Kelimeler
                  </h3>
                  <span className="text-xs text-gray-500">
                    {keywords.length + elasticAnalysis.suggestedKeywords.length}{" "}
                    kelime
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Mevcut keyword'ler */}
                  {keywords.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Mevcut</div>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm"
                          >
                            {keyword}
                            <button
                              onClick={() =>
                                setKeywords((kw) =>
                                  kw.filter((k) => k !== keyword)
                                )
                              }
                              className="ml-2 text-blue-400 hover:text-blue-300"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Önerilen keyword'ler */}
                  {elasticAnalysis.suggestedKeywords.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">
                        Önerilen (Elasticsearch)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {elasticAnalysis.suggestedKeywords.map(
                          (keyword, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                if (!keywords.includes(keyword)) {
                                  setKeywords((kw) => [...kw, keyword]);
                                }
                              }}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                                keywords.includes(keyword)
                                  ? "bg-green-900/50 text-green-300"
                                  : "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
                              }`}
                            >
                              {keyword}
                              {!keywords.includes(keyword) && " +"}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">
                    İstatistikler
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {wordCount}
                      </div>
                      <div className="text-xs text-gray-400">Kelime</div>
                    </div>
                    <div className="p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {content.length}
                      </div>
                      <div className="text-xs text-gray-400">Karakter</div>
                    </div>
                  </div>
                </div>

                {/* Readability */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">
                    Okunabilirlik
                  </h3>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Elasticsearch Score</span>
                      <span className="font-bold">
                        {elasticAnalysis.readabilityScore}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                        style={{
                          width: `${elasticAnalysis.readabilityScore}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shortcuts */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Kısayollar
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ctrl + S</span>
                    <span className="text-gray-400">Kaydet</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Esc</span>
                    <span className="text-gray-400">Çık</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ctrl + K</span>
                    <span className="text-gray-400">Kelime Ekle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
