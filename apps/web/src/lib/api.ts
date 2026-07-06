import type {
  AdminPaymentOrder,
  AdminStats,
  AdminUser,
  Auction,
  AuthResponse,
  Bid,
  CreateListingRequest,
  InitiatePaymentResponse,
  LoginRequest,
  PaymentOrder,
  PlaceBidResponse,
  RegisterRequest,
  SellerStats,
  User,
} from "@bidmarket/shared";

function getApiBase() {
  if (typeof window === "undefined") {
    return process.env.API_URL ?? "http://localhost:4000";
  }
  return "/api";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body != null && options.body !== "") {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Cannot reach the API. Start it with: npm run dev:api",
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

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

  becomeSeller: (token: string) =>
    request<{ user: User }>("/seller/become", { method: "POST" }, token),

  getSellerAuctions: (token: string) =>
    request<Auction[]>("/seller/auctions", {}, token),

  getSellerStats: (token: string) =>
    request<SellerStats>("/seller/stats", {}, token),

  createListing: (input: CreateListingRequest, token: string) =>
    request<Auction>("/seller/auctions", {
      method: "POST",
      body: JSON.stringify(input),
    }, token),

  initiatePayment: (auctionId: string, token: string) =>
    request<InitiatePaymentResponse>(
      `/payments/auctions/${auctionId}/initiate`,
      { method: "POST" },
      token,
    ),

  getPaymentOrder: (orderId: string, token: string) =>
    request<PaymentOrder>(`/payments/orders/${orderId}`, {}, token),

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
};
