"use client";

import { Check, Edit2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ExpandableEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "input" | "textarea";
  compactHeight?: string;
  className?: string;
  showAIOptions?: boolean;
  onAIApply?: () => void;
  onResetOriginal?: () => void;
  hasOriginalAI?: boolean;
  autoFocus?: boolean;
}

export function ExpandableEditor({
  label,
  value,
  onChange,
  placeholder,
  type = "input",
  compactHeight = "60px",
  className = "",
  showAIOptions = false,
  onAIApply,
  onResetOriginal,
  hasOriginalAI = false,
  autoFocus = false,
}: ExpandableEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const startEditing = () => {
    setTempValue(value);
    setIsEditing(true);
  };

  const saveEdit = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTempValue(e.target.value);
  };

  // Textarea otomatik boyutlandırma
  const adjustTextareaHeight = () => {
    if (textareaRef.current && type === "textarea") {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [tempValue]);

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {isEditing && (
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded">
              Düzenleniyor
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* AI Butonları */}
          {showAIOptions && onAIApply && (
            <button
              onClick={onAIApply}
              className="text-xs flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 rounded transition-colors"
              title="AI Önerisini Uygula"
            >
              <span className="text-sm">🤖</span>
              AI
            </button>
          )}

          {showAIOptions && onResetOriginal && hasOriginalAI && (
            <button
              onClick={onResetOriginal}
              className="text-xs flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Orijinal AI'ya Dön"
            >
              <span className="text-xs">↺</span>
              Orijinal
            </button>
          )}

          {/* Edit Butonu */}
          <button
            onClick={isEditing ? saveEdit : startEditing}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            title={isEditing ? "Kaydet" : "Düzenle"}
          >
            {isEditing ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative bg-white dark:bg-gray-900">
        {isEditing ? (
          <div className="p-4">
            {/* Edit kontrol butonları */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={saveEdit}
                className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
              >
                Kaydet
              </button>
              <button
                onClick={cancelEdit}
                className="text-xs px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
              >
                İptal
              </button>
            </div>

            {/* Input/Textarea */}
            {type === "input" ? (
              <input
                type="text"
                value={tempValue}
                onChange={handleChange}
                className="w-full px-4 py-3 text-lg font-semibold border-2 border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800"
                placeholder={placeholder}
                autoFocus={autoFocus}
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={tempValue}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-green-300 dark:border-green-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 resize-none min-h-[200px]"
                placeholder={placeholder}
                style={{
                  transition: "height 0.3s ease-in-out",
                }}
                autoFocus={autoFocus}
              />
            )}
          </div>
        ) : (
          <div
            className={`p-4 cursor-pointer transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800 ${
              !value ? "italic text-gray-400 dark:text-gray-500" : ""
            }`}
            onClick={startEditing}
            style={{
              height: compactHeight,
              overflowY: "hidden",
              transition: "height 0.3s ease-in-out",
            }}
          >
            {type === "input" ? (
              <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate">
                {value || placeholder}
              </h3>
            ) : (
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {value || <span className="italic">{placeholder}</span>}
              </p>
            )}

            {!value && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Tıklayarak düzenlemeye başlayın...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
