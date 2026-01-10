// app/api/ai/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";

const CLOUDFLARE_AI_URL =
  "https://ai-summarize-and-title.alimgiyik.workers.dev/";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "En az 10 karakterlik metin gerekli",
          title: "",
          summary: "",
          language: "tr",
          wordCount: 0,
        },
        { status: 400 }
      );
    }

    // Cloudflare Worker'a istek gönder
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(CLOUDFLARE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${process.env.CLOUDFLARE_WORKER_API_KEY}`,
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Cloudflare AI error: ${response.status}`);
    }

    const result = await response.json();

    // Direkt olarak Cloudflare Worker'ın response'unu döndür
    // Sadece success durumunu kontrol et
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        title: result.data.title,
        summary: result.data.summary,
        language: result.data.language,
        wordCount: result.data.wordCount,
        timestamp: result.timestamp,
      });
    }

    // Eğer success false ise
    throw new Error(result.error || "AI service returned an error");
  } catch (error: any) {
    console.error("AI suggestion error:", error);

    // Fallback response
    const { text } = await request.json().catch(() => ({ text: "" }));

    if (text) {
      const sentences = text.split(/[.!?]+/);
      const firstSentence = sentences[0]?.trim() || text;
      const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

      // Basit dil tespiti
      let language = "tr";
      const lowerText = text.toLowerCase();
      if (
        lowerText.includes(" the ") ||
        lowerText.includes(" and ") ||
        lowerText.includes(" for ")
      ) {
        language = "en";
      }

      return NextResponse.json({
        success: false,
        error: error?.message || "AI service temporary unavailable",
        title:
          firstSentence.length > 60
            ? firstSentence.substring(0, 60) + "..."
            : firstSentence,
        summary: text.length > 200 ? text.substring(0, 200) + "..." : text,
        language: language,
        wordCount: wordCount,
        timestamp: new Date().toISOString(),
        fallback: true,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "AI suggestion service is unavailable",
        title: "Yeni Not",
        summary: "",
        language: "tr",
        wordCount: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint (test için)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST with { "text": "your content" }',
    example: {
      success: true,
      data: {
        title: "Stream of Endless Creativity",
        summary: "The stream is teeming with life...",
        language: "en",
        wordCount: 76,
      },
      timestamp: "2026-01-06T11:50:33.173Z",
    },
  });
}
