// app/api/elasticsearch/[...path]/route.ts
import { Client } from "@elastic/elasticsearch";
import { NextRequest, NextResponse } from "next/server";

// Server-side Elasticsearch client
const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME!,
    password: process.env.ELASTICSEARCH_PASSWORD!,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Proxy tüm Elasticsearch isteklerini
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> } // ✅ params is Promise
) {
  const resolvedParams = await params; // ✅ Await the params
  return handleRequest(request, resolvedParams, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> } // ✅ params is Promise
) {
  const resolvedParams = await params; // ✅ Await the params
  return handleRequest(request, resolvedParams, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> } // ✅ params is Promise
) {
  const resolvedParams = await params; // ✅ Await the params
  return handleRequest(request, resolvedParams, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> } // ✅ params is Promise
) {
  const resolvedParams = await params; // ✅ Await the params
  return handleRequest(request, resolvedParams, "DELETE");
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] }, // ✅ Already resolved params
  method: string
) {
  try {
    const path = params.path.join("/");
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);

    let body;
    if (method === "POST" || method === "PUT") {
      try {
        body = await request.json();
      } catch {
        body = undefined;
      }
    }

    // Elasticsearch'e proxy yap
    const response = await elasticClient.transport.request({
      method,
      path: `/${path}`,
      querystring: searchParams,
      body,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Elasticsearch proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Elasticsearch error" },
      { status: error.statusCode || 500 }
    );
  }
}
