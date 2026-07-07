import "server-only";

import type { Auction } from "@bidmarket/shared";
import { getApp } from "@/lib/server-api";

type ServerRequestOptions = {
  method?: string;
  body?: string;
  token?: string | null;
};

function getHttpApiBaseUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

async function inProcessRequest<T>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  const app = await getApp();
  const headers: Record<string, string> = {};

  if (options.body) {
    headers["content-type"] = "application/json";
  }
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  const response = await app.inject({
    method: options.method ?? "GET",
    url: path,
    headers,
    payload: options.body,
  });

  if (response.statusCode >= 400) {
    let message = "Request failed";
    try {
      const error = JSON.parse(response.body) as { message?: string };
      message = error.message ?? message;
    } catch {
      // Keep default message when body is not JSON.
    }
    throw new Error(message);
  }

  if (!response.body) {
    return undefined as T;
  }

  return JSON.parse(response.body) as T;
}

async function httpRequest<T>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  const headers = new Headers();
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${getHttpApiBaseUrl()}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body,
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(
      typeof error.message === "string" ? error.message : "Request failed",
    );
  }

  return response.json() as Promise<T>;
}

async function serverRequest<T>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  try {
    return await inProcessRequest<T>(path, options);
  } catch (inProcessError) {
    console.error(
      `In-process API failed for ${path}, falling back to HTTP:`,
      inProcessError,
    );
    return httpRequest<T>(path, options);
  }
}

/** Server-side API access — in-process Fastify with HTTP fallback. */
export const serverApi = {
  getAuctions: (token?: string | null) =>
    serverRequest<Auction[]>("/auctions", { token }),

  getAuction: (id: string, token?: string | null) =>
    serverRequest<Auction>(`/auctions/${id}`, { token }),
};
