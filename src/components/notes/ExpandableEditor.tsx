"use client";

import {
  Check,
  Edit2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ExpandableEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "input" | "textarea";
  compactHeight?: string;
  expandedHeight?: string;
  className?: string;
  showAIOptions?: boolean;
  onAIApply?: () => void;
  onResetOriginal?: () => void;
  hasOriginalAI?: boolean;
  isFullscreenMode?: boolean; // Yeni prop
  onFullscreenToggle?: () => void; // Yeni prop
  autoFocus?: boolean;
  isExpandable: boolean;
}

export function ExpandableEditor({
  label,
  value,
  onChange,
  placeholder,
  type = "input",
  compactHeight = "60px",
  expandedHeight = "200px",
  className = "",
  showAIOptions = false,
  onAIApply,
  onResetOriginal,
  hasOriginalAI = false,
  isFullscreenMode = false, // Varsayılan false
  onFullscreenToggle,
  isExpandable,
  autoFocus = false,
}: ExpandableEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Eğer genişletiliyorsa, edit moda da geç
    if (!isExpanded && !isEditing) {
      setTempValue(value);
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  const startEditing = () => {
    setTempValue(value);
    setIsEditing(true);
  };

  const saveEdit = () => {
    onChange(tempValue);
    setIsEditing(false);
    if (onFullscreenToggle) {
      onFullscreenToggle();
    }
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

  // Fullscreen mode'a göre otomatik focus
  useEffect(() => {
    if (isFullscreenMode && textareaRef.current && type === "textarea") {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isFullscreenMode, type]);

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
      className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${className} ${
        isExpanded || isFullscreenMode
          ? "ring-2 ring-blue-500/20 dark:ring-blue-400/20"
          : ""
      } ${isFullscreenMode ? "fixed inset-0 z-50 m-0 rounded-none border-none" : ""}`}
    >
      {/* Header - Fullscreen mode'da gizle */}
      {!isFullscreenMode && (
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

            {/* Fullscreen Butonu - Sadece textarea için */}
            {type === "textarea" && onFullscreenToggle && (
              <button
                onClick={() => {
                  setTempValue(value);
                  onFullscreenToggle();
                }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                title={isFullscreenMode ? "Tam Ekrandan Çık" : "Tam Ekran"}
              >
                {isFullscreenMode ? (
                  <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
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

            {/* Expand/Collapse Butonu */}
            {isExpandable && (
              <button
                onClick={toggleExpand}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                title={isExpanded ? "Küçült" : "Genişlet"}
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div
        className={`relative bg-white dark:bg-gray-900 ${isFullscreenMode ? "h-full" : ""}`}
      >
        {isEditing || isFullscreenMode ? (
          <div className={`${isFullscreenMode ? "h-full p-6" : "p-4"}`}>
            {/* Fullscreen mode header */}
            {isFullscreenMode && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onFullscreenToggle}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Tam Ekrandan Çık"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <span className="font-semibold text-lg text-gray-700 dark:text-gray-300">
                    Tam Ekran Düzenleme
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {showAIOptions && onAIApply && (
                    <button
                      onClick={() => onAIApply()}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span>🤖</span>
                      AI Önerisini Uygula
                    </button>
                  )}
                  <button
                    onClick={saveEdit}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Kaydet ve Çık
                  </button>
                </div>
              </div>
            )}

            {/* Edit kontrol butonları - Fullscreen dışında */}
            {!isFullscreenMode && isEditing && (
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
            )}

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
                className={`w-full px-4 py-3 border-2 border-green-300 dark:border-green-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 resize-none ${
                  isFullscreenMode ? "h-[calc(100vh-120px)] text-lg" : ""
                }`}
                placeholder={placeholder}
                style={{
                  height:
                    isExpanded && !isFullscreenMode
                      ? expandedHeight
                      : compactHeight,
                  transition: "height 0.3s ease-in-out",
                  minHeight: isFullscreenMode ? "auto" : "80px",
                }}
                autoFocus={autoFocus || isFullscreenMode}
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
              height: isExpanded ? expandedHeight : compactHeight,
              overflowY: isExpanded ? "auto" : "hidden",
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

            {!isExpanded && !value && (
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
