"use client";

import { useAuth } from "@/lib/auth";
import { noteAPI } from "@/lib/elasticsearch-client"; // ✅ Changed from elasticClient to noteAPI
import { useState } from "react";

interface NoteEditorProps {
  onNoteCreated?: () => void;
}

export default function NoteEditor({ onNoteCreated }: NoteEditorProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [predictedCategory, setPredictedCategory] = useState<string>("");

  // Kategori tahmini (realtime) - This matches the one in elasticsearch-client.ts
  const predictCategory = (text: string) => {
    if (text.length < 10) return "";

    const categories = {
      Alışveriş: [
        "market",
        "süt",
        "ekmek",
        "yumurta",
        "alışveriş",
        "fiyat",
        "liste",
      ],
      İş: ["toplantı", "proje", "deadline", "iş", "sunum", "rapor", "mail"],
      Kişisel: [
        "düşünce",
        "plan",
        "hedef",
        "kişisel",
        "günlük",
        "hayat",
        "mutlu",
      ],
      Sağlık: [
        "doktor",
        "randevu",
        "ilaç",
        "sağlık",
        "spor",
        "diyet",
        "checkup",
      ],
      Faturalar: [
        "fatura",
        "ödeme",
        "elektrik",
        "su",
        "internet",
        "kredi",
        "borç",
      ],
    };

    const textLower = text.toLowerCase();
    let bestCategory = "";
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter((keyword) =>
        textLower.includes(keyword)
      ).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    }

    return bestCategory || "Genel";
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setPredictedCategory(predictCategory(newContent));
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    setIsSubmitting(true);
    try {
      // ✅ Changed from elasticClient.createNote() to noteAPI.createNote()
      await noteAPI.createNote(user.id, content); // Correct method signature
      setContent("");
      setPredictedCategory("");
      onNoteCreated?.();
    } catch (error) {
      console.error("Not oluşturma hatası:", error);
      alert("Not kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Yeni Not Ekle</h3>
        <p className="text-sm text-gray-600">
          Notunuzu yazın, AI otomatik kategori önerecek.
        </p>
      </div>

      <textarea
        value={content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
        placeholder="Ne düşünüyorsunuz? Örnek: 'Marketten süt, yumurta ve ekmek alınacak' veya 'Yarın saat 14:00'te toplantı var'"
        className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={isSubmitting}
      />

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {predictedCategory && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              AI Önerisi: {predictedCategory}
            </div>
          )}

          <div className="text-sm text-gray-500">
            {content.length > 0 && `${content.split(/\s+/).length} kelime`}
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => {
              setContent("");
              setPredictedCategory("");
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={isSubmitting || !content.trim()}
          >
            Temizle
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Kaydediliyor...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Kaydet (Ctrl+Enter)
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>💡 İpuçları:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>
            &quot;Market&quot;, &quot;alışveriş&quot; kelimeleri → Alışveriş
            kategorisi
          </li>
          <li>
            &quot;Toplantı&quot;, &quot;proje&quot; kelimeleri → İş kategorisi
          </li>
          <li>
            &quot;Doktor&quot;, &quot;randevu&quot; kelimeleri → Sağlık
            kategorisi
          </li>
        </ul>
      </div>
    </div>
  );
}
