import type { NextRequest } from "next/server";
import { getApp } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handleRequest(request: NextRequest, context: RouteContext) {
  try {
    const { path } = await context.params;
    const url = `/${path.join("/")}${request.nextUrl.search}`;
    const app = await getApp();

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const payload = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

    const response = await app.inject({
      method: request.method,
      url,
      headers,
      payload,
    });

    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined) {
        responseHeaders.set(key, String(value));
      }
    }

    return new Response(response.body, {
      status: response.statusCode,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API route failed:", error);
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}
