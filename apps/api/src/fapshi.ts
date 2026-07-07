import type { PaymentStatus } from "@bidmarket/shared";

const SANDBOX_URL = "https://sandbox.fapshi.com";
const LIVE_URL = "https://live.fapshi.com";

export interface FapshiInitiatePayInput {
  amount: number;
  email?: string;
  redirectUrl?: string;
  userId?: string;
  externalId?: string;
  message?: string;
}

export interface FapshiInitiatePayResult {
  transId: string;
  link: string;
}

export interface FapshiWebhookPayload {
  transId?: string;
  trans_id?: string;
  transactionId?: string;
  status?: string;
  state?: string;
  externalId?: string;
  amount?: number;
}

export interface FapshiTransactionStatus {
  transId: string;
  status: string;
  externalId?: string;
}

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isValidApiKey(apiKey: string): boolean {
  return apiKey.startsWith("FAK_TEST_") || apiKey.startsWith("FAK_");
}

function resolveBaseUrl(apiKey: string): string {
  const env = trimEnv(process.env.FAPSHI_ENV).toLowerCase();

  if (env === "live" || env === "production" || env === "prod") {
    return LIVE_URL;
  }

  if (env === "sandbox" || env === "test" || env === "development") {
    return SANDBOX_URL;
  }

  if (apiKey.startsWith("FAK_TEST_")) {
    return SANDBOX_URL;
  }

  if (apiKey.startsWith("FAK_")) {
    return LIVE_URL;
  }

  return SANDBOX_URL;
}

function getCredentials(): { apiUser: string; apiKey: string } | null {
  const apiUser = trimEnv(process.env.FAPSHI_API_USER);
  const apiKey = trimEnv(process.env.FAPSHI_API_KEY);

  if (!apiUser || !apiKey || !isValidApiKey(apiKey)) {
    return null;
  }

  return { apiUser, apiKey };
}

export function isFapshiConfigured(): boolean {
  return getCredentials() !== null;
}

export function getFapshiMode(): "mock" | "sandbox" | "live" {
  const credentials = getCredentials();
  if (!credentials) {
    return "mock";
  }

  return resolveBaseUrl(credentials.apiKey) === LIVE_URL ? "live" : "sandbox";
}

export function getFapshiConfigStatus(): {
  configured: boolean;
  mode: "mock" | "sandbox" | "live";
  missing: string[];
} {
  const apiUser = trimEnv(process.env.FAPSHI_API_USER);
  const apiKey = trimEnv(process.env.FAPSHI_API_KEY);
  const missing: string[] = [];

  if (!apiUser) {
    missing.push("FAPSHI_API_USER");
  }
  if (!apiKey) {
    missing.push("FAPSHI_API_KEY");
  } else if (!isValidApiKey(apiKey)) {
    missing.push("FAPSHI_API_KEY (must start with FAK_ or FAK_TEST_)");
  }

  const configured = missing.length === 0;
  return {
    configured,
    mode: configured ? getFapshiMode() : "mock",
    missing,
  };
}

export function getFapshiSetupHint(): string {
  return "Payments are not configured yet. Add FAPSHI_API_USER and FAPSHI_API_KEY from your Fapshi dashboard to Vercel (Production), set FAPSHI_ENV=live for live keys, then redeploy.";
}

export async function initiatePay(
  input: FapshiInitiatePayInput,
): Promise<FapshiInitiatePayResult> {
  const credentials = getCredentials();
  if (!credentials) {
    throw new Error(getFapshiSetupHint());
  }

  if (input.amount < 100) {
    throw new Error("Fapshi minimum payment amount is 100 XAF");
  }

  const baseUrl = resolveBaseUrl(credentials.apiKey);

  const response = await fetch(`${baseUrl}/initiate-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiuser: credentials.apiUser,
      apikey: credentials.apiKey,
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : "Failed to initiate Fapshi payment";

    if (/invalid apiuser|invalid api key|invalid api credentials/i.test(message)) {
      throw new Error(
        "Fapshi rejected the API credentials. Check FAPSHI_API_USER, FAPSHI_API_KEY, and FAPSHI_ENV (sandbox vs live) in your deployment settings.",
      );
    }

    throw new Error(message);
  }

  const transId = String(data.transId ?? data.trans_id ?? "");
  const link = String(data.link ?? data.paymentUrl ?? data.url ?? "");

  if (!transId || !link) {
    throw new Error("Invalid response from Fapshi");
  }

  return { transId, link };
}

export function parseFapshiWebhookPayload(
  body: unknown,
): FapshiTransactionStatus | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as FapshiWebhookPayload;
  const transId = String(
    record.transId ?? record.trans_id ?? record.transactionId ?? "",
  ).trim();
  const status = String(record.status ?? record.state ?? "").trim();
  const externalId = record.externalId
    ? String(record.externalId).trim()
    : undefined;

  if (!transId || !status) {
    return null;
  }

  return { transId, status, externalId };
}

export async function getPaymentStatus(
  transId: string,
): Promise<FapshiTransactionStatus> {
  const credentials = getCredentials();
  if (!credentials) {
    throw new Error("Fapshi is not configured");
  }

  const baseUrl = resolveBaseUrl(credentials.apiKey);
  const response = await fetch(
    `${baseUrl}/payment-status/${encodeURIComponent(transId)}`,
    {
      method: "GET",
      headers: {
        apiuser: credentials.apiUser,
        apikey: credentials.apiKey,
      },
    },
  );

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : "Failed to fetch Fapshi payment status";
    throw new Error(message);
  }

  const parsed = parseFapshiWebhookPayload(data);
  if (!parsed) {
    throw new Error("Invalid payment status response from Fapshi");
  }

  return parsed;
}

export function normalizeFapshiStatus(status: string): PaymentStatus {
  switch (status.trim().toUpperCase()) {
    case "SUCCESSFUL":
      return "successful";
    case "EXPIRED":
      return "expired";
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}

export function verifyWebhookSecret(headerValue?: string): boolean {
  const secret = trimEnv(process.env.FAPSHI_WEBHOOK_SECRET);
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return headerValue === secret;
}

export function mapFapshiStatus(
  status: string,
): "successful" | "failed" | "expired" | "pending" {
  const normalized = normalizeFapshiStatus(status);
  if (normalized === "pending") {
    return "pending";
  }
  return normalized;
}
