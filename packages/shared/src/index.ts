export type UserRole = "bidder" | "seller" | "admin";

export type AuctionStatus = "scheduled" | "live" | "ended";

export type ProductStatus = "draft" | "pending" | "live" | "sold";

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  isSeller: boolean;
  isAdmin: boolean;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  status: ProductStatus;
}

export interface Auction {
  id: string;
  productId: string;
  product: Product;
  startPrice: number;
  currentBid: number;
  bidIncrement: number;
  bidCount: number;
  highBidderId: string | null;
  startsAt: string;
  endsAt: string;
  status: AuctionStatus;
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  amount: number;
  createdAt: string;
}

export interface PlaceBidRequest {
  amount: number;
}

export interface PlaceBidResponse {
  auction: Auction;
  bid: Bid;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  startPrice: number;
  bidIncrement: number;
  durationMinutes: number;
}

export interface UploadImageResponse {
  url: string;
}

export interface SellerStats {
  activeListings: number;
  totalBids: number;
  totalRevenue: number;
}

export interface AdminStats {
  totalUsers: number;
  totalSellers: number;
  liveAuctions: number;
  endedAuctions: number;
  totalBids: number;
  pendingPayments: number;
  successfulPayments: number;
  totalRevenue: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  isSeller: boolean;
  isAdmin: boolean;
}

export interface AdminPaymentOrder extends PaymentOrder {
  auctionTitle: string;
  buyerName: string;
}

export type PaymentStatus = "pending" | "successful" | "failed" | "expired";

export interface PaymentOrder {
  id: string;
  auctionId: string;
  buyerId: string;
  amount: number;
  status: PaymentStatus;
  fapshiTransId: string | null;
  paymentUrl: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface InitiatePaymentResponse {
  order: PaymentOrder;
  paymentUrl: string;
}

export function getMinimumBid(auction: Auction): number {
  if (auction.bidCount === 0) {
    return auction.startPrice;
  }
  return auction.currentBid + auction.bidIncrement;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const LISTING_CATEGORIES = [
  "Art",
  "Cameras",
  "Collectibles",
  "Electronics",
  "Fashion",
  "Furniture",
  "Jewelry",
  "Watches",
  "Other",
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export interface ListingDraftRequest {
  keywords: string;
  imageUrl?: string;
  conditionHint?: string;
}

export interface ListingDraftResponse {
  title: string;
  descriptionEn: string;
  descriptionFr: string;
  category: ListingCategory;
  startPrice: number;
  bidIncrement: number;
  priceReasoning: string;
}

export interface AiSearchRequest {
  query: string;
}

export interface AiSearchFilters {
  keywords: string[];
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  liveOnly?: boolean;
}

export interface AiSearchResponse {
  auctions: Auction[];
  interpretation: string;
  filters: AiSearchFilters;
}

export interface BidCoachRequest {
  auctionId: string;
  question: string;
}

export interface BidCoachResponse {
  answer: string;
}

export type ModerationVerdict = "approve" | "review" | "reject";

export interface ModerationResult {
  auctionId: string;
  verdict: ModerationVerdict;
  reasons: string[];
  confidence: number;
}

export interface ModerationScanResponse {
  results: ModerationResult[];
}

export {
  SESSION_PREFIX,
  createSessionToken,
  parseSessionToken,
} from "./session.js";
