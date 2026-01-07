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

export async function getAISuggestion(text: string): Promise<AISuggestion> {
  try {
    const response = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    // Başarılı response'u direkt döndür
    if (data.success) {
      return {
        success: true,
        title: data.title,
        summary: data.summary,
        language: data.language,
        wordCount: data.wordCount,
        timestamp: data.timestamp,
      };
    }

    // Başarısız ise error'u fırlat
    throw new Error(data.error || "AI suggestion failed");
  } catch (error: any) {
    console.error("AI suggestion error:", error);

    // Fallback suggestion
    return createFallbackSuggestion(text, error.message);
  }
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
