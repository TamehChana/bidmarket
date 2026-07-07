import type {
  AdminPaymentOrder,
  AdminStats,
  AdminUser,
  AiSearchResponse,
  Auction,
  AuthResponse,
  Bid,
  BidCoachResponse,
  CreateListingRequest,
  InitiatePaymentResponse,
  ListingDraftRequest,
  ListingDraftResponse,
  LoginRequest,
  ModerationScanResponse,
  PaymentOrder,
  PaymentStatus,
  PlaceBidResponse,
  RegisterRequest,
  SellerStats,
  UploadImageResponse,
  User,
} from "@bidmarket/shared";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const maxAttempts = method === "GET" ? 3 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const headers = new Headers(options.headers);
    if (options.body != null && options.body !== "") {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        cache: "no-store",
      });
    } catch {
      if (attempt < maxAttempts - 1) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw new Error(
        "Cannot reach the API. Run npm run dev from the project root (and stop any old server on port 3000).",
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      const message =
        response.status >= 500
          ? "The server is temporarily unavailable. Please try again."
          : (error.message ?? "Request failed");

      if (
        method === "GET" &&
        attempt < maxAttempts - 1 &&
        RETRYABLE_STATUSES.has(response.status)
      ) {
        await sleep(400 * (attempt + 1));
        continue;
      }

      throw new ApiError(message, response.status);
    }

    return response.json() as Promise<T>;
  }

  throw new Error("Request failed");
}

async function uploadRequest<T>(
  path: string,
  formData: FormData,
  token: string,
): Promise<T> {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach the API. Start the app with: npm run dev");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Upload failed" }));
    throw new ApiError(error.message ?? "Upload failed", response.status);
  }

  return response.json() as Promise<T>;
}

/** Browser/client API access — always uses same-origin /api routes. */
export const api = {
  getAuctions: (token?: string | null) =>
    request<Auction[]>("/auctions", {}, token),

  getAuction: (id: string, token?: string | null) =>
    request<Auction>(`/auctions/${id}`, {}, token),

  getAuctionBids: (id: string, token?: string | null) =>
    request<Bid[]>(`/auctions/${id}/bids`, {}, token),

  placeBid: (id: string, amount: number, token: string) =>
    request<PlaceBidResponse>(`/auctions/${id}/bids`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }, token),

  login: (input: LoginRequest) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  register: (input: RegisterRequest) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  me: (token: string) =>
    request<{ user: User }>("/auth/me", {}, token),

  getMyBids: (token: string) =>
    request<Auction[]>("/me/bids", {}, token),

  becomeSeller: (token: string) =>
    request<{ user: User; token: string }>("/seller/become", { method: "POST" }, token),

  getSellerAuctions: (token: string) =>
    request<Array<Auction & { paymentStatus: PaymentStatus | null }>>(
      "/seller/auctions",
      {},
      token,
    ),

  getSellerStats: (token: string) =>
    request<SellerStats>("/seller/stats", {}, token),

  syncSellerPayments: (token: string) =>
    request<{ synced: boolean }>("/seller/payments/sync", { method: "POST" }, token),

  createListing: (input: CreateListingRequest, token: string) =>
    request<Auction>("/seller/auctions", {
      method: "POST",
      body: JSON.stringify(input),
    }, token),

  uploadListingImage: (file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest<UploadImageResponse>("/seller/uploads", formData, token);
  },

  initiatePayment: (auctionId: string, token: string) =>
    request<InitiatePaymentResponse>(
      `/payments/auctions/${auctionId}/initiate`,
      { method: "POST" },
      token,
    ),

  getPaymentOrder: (orderId: string, token: string) =>
    request<PaymentOrder>(`/payments/orders/${orderId}`, {}, token),

  syncPaymentOrder: (orderId: string, token: string) =>
    request<PaymentOrder>(
      `/payments/orders/${orderId}/sync`,
      { method: "POST" },
      token,
    ),

  getAuctionPaymentStatus: (auctionId: string, token: string) =>
    request<{ status: PaymentStatus | null }>(
      `/payments/auctions/${auctionId}/status`,
      {},
      token,
    ),

  getPaymentOrders: (token: string) =>
    request<PaymentOrder[]>("/payments/orders", {}, token),

  mockConfirmPayment: (orderId: string, token: string) =>
    request<PaymentOrder>(
      `/payments/orders/${orderId}/mock-confirm`,
      { method: "POST" },
      token,
    ),

  getAdminStats: (token: string) =>
    request<AdminStats>("/admin/stats", {}, token),

  getAdminUsers: (token: string) =>
    request<AdminUser[]>("/admin/users", {}, token),

  getAdminAuctions: (token: string) =>
    request<Auction[]>("/admin/auctions", {}, token),

  getAdminPayments: (token: string) =>
    request<AdminPaymentOrder[]>("/admin/payments", {}, token),

  adminEndAuction: (auctionId: string, token: string) =>
    request<Auction>(`/admin/auctions/${auctionId}/end`, { method: "POST" }, token),

  adminRemoveAuction: (auctionId: string, token: string) =>
    request<{ success: boolean }>(
      `/admin/auctions/${auctionId}`,
      { method: "DELETE" },
      token,
    ),

  adminUpdateUserSeller: (userId: string, isSeller: boolean, token: string) =>
    request<AdminUser>(
      `/admin/users/${userId}/roles`,
      { method: "PATCH", body: JSON.stringify({ isSeller }) },
      token,
    ),

  generateListingDraft: (input: ListingDraftRequest, token: string) =>
    request<ListingDraftResponse>("/ai/listing-draft", {
      method: "POST",
      body: JSON.stringify(input),
    }, token),

  aiSearch: (query: string) =>
    request<AiSearchResponse>("/ai/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  askBidCoach: (auctionId: string, question: string) =>
    request<BidCoachResponse>("/ai/bid-coach", {
      method: "POST",
      body: JSON.stringify({ auctionId, question }),
    }),

  adminModerateAuctions: (token: string, auctionIds?: string[]) =>
    request<ModerationScanResponse>("/admin/ai/moderate", {
      method: "POST",
      body: JSON.stringify({ auctionIds }),
    }, token),
};
