"use client";

import { useAuth } from "@/lib/auth";
import { noteAPI } from "@/lib/elasticsearch-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function CreateNotePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titlePreview, setTitlePreview] = useState("");

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);

    // Başlık önizlemesi oluştur
    if (text.trim()) {
      const firstLine = text.split("\n")[0];
      setTitlePreview(
        firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine
      );
    } else {
      setTitlePreview("");
    }
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) {
      toast.error("Lütfen not içeriği girin");
      return;
    }

    setIsSubmitting(true);
    try {
      const note = await noteAPI.createNote(user.id, content);
      toast.success("Not başarıyla oluşturuldu!");
      //router.push(`/notes/${note.id}`);
    } catch (error) {
      console.error("Not oluşturma hatası:", error);
      toast.error("Not kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Yeni Not Oluştur
                </h1>
                <p className="text-blue-100 mt-1">
                  Elasticsearch otomatik başlık ve analiz oluşturacak
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                ← Geri
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Title Preview */}
            {titlePreview && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  Elasticsearch Başlık Önerisi:
                </h3>
                <p className="text-lg font-semibold text-gray-800">
                  "{titlePreview}"
                </p>
              </div>
            )}

            {/* Editor */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Not İçeriği *
              </label>
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Notunuzu buraya yazın... Elasticsearch otomatik olarak:
• Anlamlı bir başlık oluşturacak
• Anahtar kelimeleri çıkaracak
• İçeriği analiz edecek
• 3 ay sonra otomatik expire olacak"
                className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {content.split(/\s+/).filter((w) => w.length > 0).length}
                  </div>
                  <div className="text-xs text-gray-500">Kelime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {content.length}
                  </div>
                  <div className="text-xs text-gray-500">Karakter</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">3 Ay</div>
                  <div className="text-xs text-gray-500">Expire Süresi</div>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                📝 Elasticsearch ile analiz edilecek
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={isSubmitting}
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center transition-all"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                    Elasticsearch'e Kaydediliyor...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
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
                    Elasticsearch'e Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-blue-600 text-2xl mb-3">🔍</div>
            <h3 className="font-semibold text-gray-800 mb-2">Akıllı Arama</h3>
            <p className="text-gray-600 text-sm">
              Elasticsearch sayesinde notlarınızda tam metin arama yapabilir, en
              alakalı sonuçları sıralayabilirsiniz.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-blue-600 text-2xl mb-3">🤖</div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Otomatik Başlık
            </h3>
            <p className="text-gray-600 text-sm">
              Elasticsearch içeriğinizi analiz ederek otomatik olarak anlamlı
              bir başlık oluşturur.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-blue-600 text-2xl mb-3">⏰</div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Otomatik Expire
            </h3>
            <p className="text-gray-600 text-sm">
              Notlarınız 3 ay sonra otomatik olarak expire olur. Süresiz
              saklamak isterseniz güncelleyebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
