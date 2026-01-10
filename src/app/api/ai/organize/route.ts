// app/api/ai/organize/route.ts
import { NextRequest, NextResponse } from "next/server";

const CONTENT_ORGANIZER_URL =
  "https://ai-content-organizer.alimgiyik.workers.dev/";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "En az 10 karakterlik metin gerekli",
        },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(CONTENT_ORGANIZER_URL, {
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
      throw new Error(`Content Organizer error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        data: {
          language: result.data.language,
          editedContent: result.data.editedContent,
        },
        timestamp: result.timestamp,
      });
    }

    throw new Error(
      result.error || "Content Organizer service returned an error"
    );
  } catch (error: any) {
    console.error("Content Organizer error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Content Organizer service is unavailable",
        fallback: true,
      },
      { status: 500 }
    );
  }
}
