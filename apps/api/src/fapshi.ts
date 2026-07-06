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
  transId: string;
  status: "SUCCESSFUL" | "FAILED" | "EXPIRED";
  externalId?: string;
  amount?: number;
}

function getBaseUrl(): string {
  const env = process.env.FAPSHI_ENV ?? "sandbox";
  return env === "live" ? LIVE_URL : SANDBOX_URL;
}

function getCredentials(): { apiUser: string; apiKey: string } | null {
  const apiUser = process.env.FAPSHI_API_USER;
  const apiKey = process.env.FAPSHI_API_KEY;
  if (!apiUser || !apiKey) {
    return null;
  }
  return { apiUser, apiKey };
}

export function isFapshiConfigured(): boolean {
  return getCredentials() !== null;
}

export async function initiatePay(
  input: FapshiInitiatePayInput,
): Promise<FapshiInitiatePayResult> {
  const credentials = getCredentials();
  if (!credentials) {
    throw new Error("Fapshi is not configured");
  }

  if (input.amount < 100) {
    throw new Error("Fapshi minimum payment amount is 100 XAF");
  }

  const response = await fetch(`${getBaseUrl()}/initiate-pay`, {
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
    throw new Error(message);
  }

  const transId = String(data.transId ?? data.trans_id ?? "");
  const link = String(data.link ?? data.paymentUrl ?? data.url ?? "");

  if (!transId || !link) {
    throw new Error("Invalid response from Fapshi");
  }

  return { transId, link };
}

export function verifyWebhookSecret(headerValue?: string): boolean {
  const secret = process.env.FAPSHI_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return headerValue === secret;
}

export function mapFapshiStatus(
  status: FapshiWebhookPayload["status"],
): "successful" | "failed" | "expired" {
  switch (status) {
    case "SUCCESSFUL":
      return "successful";
    case "EXPIRED":
      return "expired";
    default:
      return "failed";
  }
}
