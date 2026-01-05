"use client";

import { noteAPI } from "@/lib/elasticsearch-client"; // ✅ Correct import
import { useEffect, useState } from "react";

interface CategorySidebarProps {
  userId: string;
  onCategorySelect?: (category: string) => void;
}

export default function CategorySidebar({
  userId,
  onCategorySelect,
}: CategorySidebarProps) {
  const [categories, setCategories] = useState<string[]>(["Tümü"]);
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, [userId]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const cats = await noteAPI.getCategories(userId);
      setCategories(["Tümü", ...cats.filter((cat) => cat !== "Tümü")]);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    onCategorySelect?.(category);
  };

  const categoryColors: Record<string, string> = {
    Tümü: "bg-gray-100 text-gray-800",
    Alışveriş: "bg-blue-100 text-blue-800",
    İş: "bg-green-100 text-green-800",
    Kişisel: "bg-purple-100 text-purple-800",
    Sağlık: "bg-red-100 text-red-800",
    Faturalar: "bg-yellow-100 text-yellow-800",
    Diğer: "bg-gray-100 text-gray-800",
    Genel: "bg-gray-100 text-gray-800",
  };

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Kategoriler</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 bg-gray-200 animate-pulse rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Kategoriler</h3>
        <button
          onClick={loadCategories}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Yenile
        </button>
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${getCategoryColor(
              category
            )} ${
              selectedCategory === category
                ? "ring-2 ring-blue-500"
                : "hover:opacity-90"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{category}</span>
              {category === "Tümü" && (
                <span className="text-xs bg-white px-2 py-1 rounded-full">
                  {categories.length - 1}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Renk Açıklamaları
        </h4>
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 mr-2"></div>
            <span className="text-gray-600">Alışveriş</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300 mr-2"></div>
            <span className="text-gray-600">İş</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300 mr-2"></div>
            <span className="text-gray-600">Kişisel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
