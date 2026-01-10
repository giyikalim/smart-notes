// lib/ai-helper.ts
export interface AISuggestion {
  success: boolean;
  title: string;
  summary: string;
  language: string;
  wordCount: number;
  error?: string;
  fallback?: boolean;
  timestamp?: string;
}

/**
 * Fallback suggestion oluştur
 */
function createFallbackSuggestion(
  text: string,
  errorMessage: string
): AISuggestion {
  const sentences = text.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim() || text;
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  // Basit dil tespiti
  let language = "tr";
  const lowerText = text.toLowerCase();
  const turkishChars = ["ğ", "ü", "ş", "ı", "ö", "ç"];
  const hasTurkishChars = turkishChars.some((char) => lowerText.includes(char));

  if (
    !hasTurkishChars &&
    (lowerText.includes("the") || lowerText.includes("and"))
  ) {
    language = "en";
  }

  return {
    success: false,
    title:
      firstSentence.length > 60
        ? firstSentence.substring(0, 60) + "..."
        : firstSentence,
    summary: text.length > 200 ? text.substring(0, 200) + "..." : text,
    language: language,
    wordCount: wordCount,
    error: errorMessage,
    fallback: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Basit başlık oluştur (AI yokken kullanım için)
 */
export function createSimpleTitle(text: string): string {
  if (!text.trim()) return "";

  const firstLine = text.split("\n")[0];
  return firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine;
}

/**
 * Basit özet oluştur (AI yokken kullanım için)
 */
export function createSimpleSummary(text: string): string {
  if (!text.trim()) return "";

  return text.length > 150 ? text.substring(0, 150) + "..." : text;
}

// lib/ai-helper.ts
export interface AIEditResult {
  success: boolean;
  data?: {
    language: string;
    wordCount: number;
    editedContent: string;
  };
  error?: string;
  timestamp?: string;
  fallback?: boolean;
}

export interface AIOrganizeResult {
  success: boolean;
  data?: {
    language: string;
    wordCount: number;
    editedContent: string;
  };
  error?: string;
  timestamp?: string;
}

export interface AISuggestResult {
  success: boolean;
  title: string;
  summary: string;
  language: string;
  wordCount: number;
  error?: string;
  timestamp?: string;
  fallback?: boolean;
}

export async function getAIEdit(text: string): Promise<AIEditResult> {
  try {
    const response = await fetch("/api/ai/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("AI Edit error:", error);
    return {
      success: false,
      error: "AI Edit service is unavailable",
    };
  }
}

export async function getAIOrganize(text: string): Promise<AIOrganizeResult> {
  try {
    const response = await fetch("/api/ai/organize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("AI Organize error:", error);
    return {
      success: false,
      error: "AI Organize service is unavailable",
    };
  }
}

export async function getAISuggestion(text: string): Promise<AISuggestResult> {
  try {
    const response = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("AI Suggestion error:", error);
    return {
      success: false,
      error: "AI Suggestion service is unavailable",
      title: "",
      summary: "",
      language: "tr",
      wordCount: 0,
    };
  }
}

// AI Worker types for extensibility
export interface AIWorker {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  icon: string;
  color: string;
  requiresText: boolean;
  minLength: number;
}

export const AI_WORKERS: AIWorker[] = [
  {
    id: "suggest",
    name: "AI Başlık ve Özet Öneri",
    description: "Başlık ve özet önerisi al",
    endpoint: "/api/ai/suggest",
    icon: "💡",
    color: "from-yellow-500 to-orange-500",
    requiresText: true,
    minLength: 10,
  },
  {
    id: "edit",
    name: "AI İçerik Düzenleyici",
    description: "Dilbilgisi ve biçimlendirme düzeltmeleri",
    endpoint: "/api/ai/edit",
    icon: "✏️",
    color: "from-blue-500 to-cyan-500",
    requiresText: true,
    minLength: 10,
  },
  {
    id: "organize",
    name: "AI İçerik Organizatörü",
    description: "İçeriği düzenle ve geliştir",
    endpoint: "/api/ai/organize",
    icon: "🔧",
    color: "from-green-500 to-emerald-500",
    requiresText: true,
    minLength: 10,
  },
];
