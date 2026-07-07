import type {
  Auction,
  AuthResponse,
  Bid,
  CreateListingRequest,
  LoginRequest,
  PlaceBidRequest,
  RegisterRequest,
  SellerStats,
  User,
} from "@bidmarket/shared";
import { getMinimumBid } from "@bidmarket/shared";
import { createSessionToken } from "@bidmarket/shared";
import { randomUUID } from "node:crypto";
import {
  upsertPersistedUser,
  refreshAuthStore,
  applySeedPasswords,
} from "./persistence.js";
import {
  persistMarketplaceStore,
  refreshMarketplaceStore,
} from "./marketplace-persistence.js";

const now = Date.now();

export const users: User[] = [
  {
    id: "user-1",
    email: "demo@bidmarket.com",
    name: "Demo Bidder",
    roles: ["bidder"],
    isSeller: false,
    isAdmin: false,
  },
  {
    id: "seller-1",
    email: "seller@bidmarket.com",
    name: "Vintage Finds Co.",
    roles: ["bidder", "seller"],
    isSeller: true,
    isAdmin: false,
  },
  {
    id: "admin-1",
    email: "admin@bidmarket.com",
    name: "Platform Admin",
    roles: ["bidder", "admin"],
    isSeller: false,
    isAdmin: true,
  },
];

export const auctions: Auction[] = [
  {
    id: "auction-1",
    productId: "product-1",
    product: {
      id: "product-1",
      sellerId: "seller-1",
      sellerName: "Vintage Finds Co.",
      title: "Leica M6 Film Camera",
      description:
        "Classic 35mm rangefinder in excellent condition. Recently serviced with new light seals. Includes original leather case.",
      category: "Cameras",
      images: [
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80",
      ],
      status: "live",
    },
    startPrice: 750_000,
    currentBid: 1_150_000,
    bidIncrement: 25_000,
    bidCount: 23,
    highBidderId: "user-1",
    startsAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(now + 2 * 60 * 60 * 1000 + 14 * 60 * 1000).toISOString(),
    status: "live",
  },
  {
    id: "auction-2",
    productId: "product-2",
    product: {
      id: "product-2",
      sellerId: "seller-1",
      sellerName: "Vintage Finds Co.",
      title: "Eames Lounge Chair & Ottoman",
      description:
        "Authentic Herman Miller production. Rosewood veneer with black leather. Minor wear consistent with age.",
      category: "Furniture",
      images: [
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
      ],
      status: "live",
    },
    startPrice: 1_500_000,
    currentBid: 2_500_000,
    bidIncrement: 50_000,
    bidCount: 31,
    highBidderId: null,
    startsAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
    status: "live",
  },
  {
    id: "auction-3",
    productId: "product-3",
    product: {
      id: "product-3",
      sellerId: "seller-1",
      sellerName: "Vintage Finds Co.",
      title: "Rolex Submariner Date",
      description:
        "Reference 16610, box and papers included. Serviced in 2024. Keeps excellent time.",
      category: "Watches",
      images: [
        "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80",
      ],
      status: "live",
    },
    startPrice: 3_000_000,
    currentBid: 5_250_000,
    bidIncrement: 125_000,
    bidCount: 18,
    highBidderId: null,
    startsAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
    status: "live",
  },
  {
    id: "auction-4",
    productId: "product-4",
    product: {
      id: "product-4",
      sellerId: "seller-1",
      sellerName: "Vintage Finds Co.",
      title: "Original Banksy Screen Print",
      description:
        "Authenticated street art print, framed with COA. Edition of 150.",
      category: "Art",
      images: [
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80",
      ],
      status: "live",
    },
    startPrice: 5_000_000,
    currentBid: 7_750_000,
    bidIncrement: 250_000,
    bidCount: 9,
    highBidderId: null,
    startsAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    status: "live",
  },
];

export const bids: Bid[] = [
  {
    id: "bid-1",
    auctionId: "auction-1",
    userId: "user-1",
    userName: "Demo Bidder",
    amount: 1_150_000,
    createdAt: new Date(now - 12 * 60 * 1000).toISOString(),
  },
  {
    id: "bid-2",
    auctionId: "auction-1",
    userId: "user-2",
    userName: "Collector99",
    amount: 1_100_000,
    createdAt: new Date(now - 28 * 60 * 1000).toISOString(),
  },
];

const passwords = new Map<string, string>();

export { passwords };

applySeedPasswords(passwords);

export function findUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  return users.find((user) => user.id === id);
}

export function validatePassword(email: string, password: string): boolean {
  const stored = passwords.get(email.toLowerCase());
  return stored !== undefined && stored === password;
}

function nextUserId(): string {
  return `user-${randomUUID()}`;
}

export async function registerUser(input: RegisterRequest): Promise<User> {
  await refreshAuthStore(users, passwords);

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;

  if (!email || !name || !password) {
    throw new Error("Missing required fields");
  }

  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const user: User = {
    id: nextUserId(),
    email,
    name,
    roles: ["bidder"],
    isSeller: false,
    isAdmin: false,
  };

  users.push(user);
  passwords.set(email, password);
  await upsertPersistedUser(users, passwords, user, password);
  return user;
}

export function createAuthResponse(user: User): AuthResponse {
  return {
    user,
    token: createSessionToken(user),
  };
}

export async function loginUser(input: LoginRequest): Promise<AuthResponse> {
  await refreshAuthStore(users, passwords);

  const email = input.email.trim().toLowerCase();
  const user = findUserByEmail(email);
  if (!user || !validatePassword(email, input.password)) {
    throw new Error("Invalid email or password");
  }

  return createAuthResponse(user);
}

export function getAuctionBids(auctionId: string): Bid[] {
  return bids
    .filter((bid) => bid.auctionId === auctionId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function placeBid(
  auctionId: string,
  user: User,
  input: PlaceBidRequest,
): Promise<{ auction: Auction; bid: Bid }> {
  await refreshMarketplaceStore(auctions, bids);

  const auction = auctions.find((item) => item.id === auctionId);
  if (!auction) {
    throw new Error("Auction not found");
  }

  if (auction.status !== "live") {
    throw new Error("Auction is not live");
  }

  if (auction.product.sellerId === user.id) {
    throw new Error("You cannot bid on your own listing");
  }

  if (new Date(auction.endsAt).getTime() <= Date.now()) {
    auction.status = "ended";
    throw new Error("Auction has ended");
  }

  const minimumBid = getMinimumBid(auction);
  if (input.amount < minimumBid) {
    throw new Error(`Bid must be at least ${minimumBid} XAF`);
  }

  const bid: Bid = {
    id: `bid-${randomUUID()}`,
    auctionId,
    userId: user.id,
    userName: user.name,
    amount: input.amount,
    createdAt: new Date().toISOString(),
  };

  bids.unshift(bid);
  auction.currentBid = input.amount;
  auction.bidCount += 1;
  auction.highBidderId = user.id;

  await persistMarketplaceStore(auctions, bids, { critical: true });
  return { auction, bid };
}

export async function becomeSeller(user: User): Promise<User> {
  await refreshAuthStore(users, passwords);

  if (user.isSeller) {
    return user;
  }

  let stored = findUserById(user.id);
  if (!stored) {
    stored = { ...user };
    users.push(stored);
  }

  stored.roles = [...stored.roles, "seller"];
  stored.isSeller = true;
  await upsertPersistedUser(users, passwords, stored);
  return stored;
}

export function getSellerAuctions(sellerId: string): Auction[] {
  return auctions.filter((auction) => auction.product.sellerId === sellerId);
}

export function getUserBidAuctions(userId: string): Auction[] {
  const auctionIds = new Set(
    bids.filter((bid) => bid.userId === userId).map((bid) => bid.auctionId),
  );

  return auctions
    .filter((auction) => auctionIds.has(auction.id))
    .sort(
      (a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
    );
}

export function getSellerStats(sellerId: string): SellerStats {
  const sellerAuctions = getSellerAuctions(sellerId);
  const activeListings = sellerAuctions.filter(
    (auction) => auction.status === "live",
  ).length;
  const totalBids = sellerAuctions.reduce(
    (sum, auction) => sum + auction.bidCount,
    0,
  );
  const totalRevenue = sellerAuctions
    .filter((auction) => auction.status === "ended")
    .reduce((sum, auction) => sum + auction.currentBid, 0);

  return { activeListings, totalBids, totalRevenue };
}

export async function createListing(
  seller: User,
  input: CreateListingRequest,
): Promise<Auction> {
  await refreshMarketplaceStore(auctions, bids);

  if (!seller.isSeller) {
    throw new Error("Seller account required");
  }

  if (!input.title.trim()) {
    throw new Error("Title is required");
  }

  if (input.startPrice < 100) {
    throw new Error("Start price must be at least 100 XAF");
  }

  if (input.bidIncrement < 100) {
    throw new Error("Bid increment must be at least 100 XAF");
  }

  if (input.durationMinutes < 2 || input.durationMinutes > 10_080) {
    throw new Error("Duration must be between 2 minutes and 7 days");
  }

  const productId = `product-${randomUUID()}`;
  const auctionId = `auction-${randomUUID()}`;
  const startsAt = new Date();
  const endsAt = new Date(
    startsAt.getTime() + input.durationMinutes * 60 * 1000,
  );

  const auction: Auction = {
    id: auctionId,
    productId,
    product: {
      id: productId,
      sellerId: seller.id,
      sellerName: seller.name,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim() || "General",
      images: [input.imageUrl.trim() || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80"],
      status: "live",
    },
    startPrice: input.startPrice,
    currentBid: input.startPrice,
    bidIncrement: input.bidIncrement,
    bidCount: 0,
    highBidderId: null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    status: "live",
  };

  auctions.unshift(auction);
  await persistMarketplaceStore(auctions, bids, { critical: true });
  return auction;
}
