import { randomUUID } from "node:crypto";
import type { PaymentOrder, PaymentStatus } from "@bidmarket/shared";
import type { Auction } from "@bidmarket/shared";
import { auctions, bids } from "./store.js";
import { initiatePay, isFapshiConfigured, getPaymentStatus, normalizeFapshiStatus } from "./fapshi.js";
import {
  persistPaymentStore,
  refreshPaymentStore,
} from "./payment-persistence.js";
import { persistMarketplaceStore, refreshMarketplaceStore } from "./marketplace-persistence.js";

export const paymentOrders: PaymentOrder[] = [];

function isAuctionEnded(auction: Auction): boolean {
  if (auction.status === "ended") {
    return true;
  }
  if (new Date(auction.endsAt).getTime() <= Date.now()) {
    auction.status = "ended";
    return true;
  }
  return false;
}

export function findOrderById(orderId: string): PaymentOrder | undefined {
  return paymentOrders.find((order) => order.id === orderId);
}

export function findOrderByAuction(auctionId: string): PaymentOrder | undefined {
  return paymentOrders.find((order) => order.auctionId === auctionId);
}

export function findOrderByTransId(transId: string): PaymentOrder | undefined {
  return paymentOrders.find((order) => order.fapshiTransId === transId);
}

export function getBuyerOrders(buyerId: string): PaymentOrder[] {
  return paymentOrders
    .filter((order) => order.buyerId === buyerId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function updateOrderStatus(
  orderId: string,
  status: PaymentStatus,
): Promise<PaymentOrder | undefined> {
  await refreshPaymentStore(paymentOrders);
  await refreshMarketplaceStore(auctions, bids);

  const order = findOrderById(orderId);
  if (!order) {
    return undefined;
  }

  order.status = status;
    if (status === "successful") {
    order.paidAt = new Date().toISOString();
    const auction = auctions.find((item) => item.id === order.auctionId);
    if (auction) {
      auction.product.status = "sold";
      auction.status = "ended";
      await persistMarketplaceStore(auctions, bids, { critical: true });
    }
  }

  await persistPaymentStore(paymentOrders, { critical: true });
  return order;
}

export async function syncPaymentOrderInternal(
  orderId: string,
): Promise<PaymentOrder | undefined> {
  await refreshPaymentStore(paymentOrders);
  await refreshMarketplaceStore(auctions, bids);

  const order = findOrderById(orderId);
  if (!order) {
    return undefined;
  }

  if (order.status === "successful" || !isFapshiConfigured()) {
    return order;
  }

  if (!order.fapshiTransId || order.fapshiTransId.startsWith("mock-")) {
    return order;
  }

  const fapshiStatus = await getPaymentStatus(order.fapshiTransId);
  const nextStatus = normalizeFapshiStatus(fapshiStatus.status);
  if (nextStatus === order.status || nextStatus === "pending") {
    return order;
  }

  return updateOrderStatus(order.id, nextStatus);
}

export async function syncOrderWithFapshi(
  orderId: string,
  buyerId: string,
): Promise<PaymentOrder | undefined> {
  await refreshPaymentStore(paymentOrders);
  const order = findOrderById(orderId);
  if (!order || order.buyerId !== buyerId) {
    return undefined;
  }

  return syncPaymentOrderInternal(orderId);
}

export async function syncPendingPaymentsForSeller(sellerId: string) {
  await refreshPaymentStore(paymentOrders);
  await refreshMarketplaceStore(auctions, bids);

  const sellerAuctionIds = new Set(
    auctions
      .filter((auction) => auction.product.sellerId === sellerId)
      .map((auction) => auction.id),
  );

  const pendingOrders = paymentOrders.filter(
    (order) =>
      order.status === "pending" &&
      sellerAuctionIds.has(order.auctionId) &&
      order.fapshiTransId &&
      !order.fapshiTransId.startsWith("mock-"),
  );

  for (const order of pendingOrders) {
    try {
      await syncPaymentOrderInternal(order.id);
    } catch (error) {
      console.error(`Failed to sync payment ${order.id}:`, error);
    }
  }

  let marketplaceChanged = false;
  for (const order of paymentOrders) {
    if (order.status !== "successful") {
      continue;
    }

    const auction = auctions.find((item) => item.id === order.auctionId);
    if (!auction || auction.product.sellerId !== sellerId) {
      continue;
    }

    if (auction.product.status !== "sold") {
      auction.product.status = "sold";
      marketplaceChanged = true;
    }
    if (auction.status !== "ended") {
      auction.status = "ended";
      marketplaceChanged = true;
    }
  }

  if (marketplaceChanged) {
    await persistMarketplaceStore(auctions, bids, { critical: true });
  }
}

export function getPaymentStatusForAuction(
  auctionId: string,
): PaymentStatus | null {
  return findOrderByAuction(auctionId)?.status ?? null;
}

export function getSellerRevenue(sellerId: string): number {
  const sellerAuctionIds = new Set(
    auctions
      .filter((auction) => auction.product.sellerId === sellerId)
      .map((auction) => auction.id),
  );

  return paymentOrders
    .filter(
      (order) =>
        order.status === "successful" && sellerAuctionIds.has(order.auctionId),
    )
    .reduce((sum, order) => sum + order.amount, 0);
}

export async function createPaymentOrder(input: {
  auctionId: string;
  buyerId: string;
  buyerEmail: string;
  redirectUrl: string;
}): Promise<{ order: PaymentOrder; paymentUrl: string }> {
  await refreshPaymentStore(paymentOrders);

  const auction = auctions.find((item) => item.id === input.auctionId);
  if (!auction) {
    throw new Error("Auction not found");
  }

  if (!isAuctionEnded(auction)) {
    throw new Error("Auction has not ended yet");
  }

  if (auction.highBidderId !== input.buyerId) {
    throw new Error("Only the winning bidder can pay for this auction");
  }

  if (auction.bidCount === 0) {
    throw new Error("No winning bid on this auction");
  }

  const existing = findOrderByAuction(input.auctionId);
  if (existing?.status === "successful") {
    throw new Error("This auction has already been paid");
  }

  if (existing?.status === "pending" && existing.paymentUrl) {
    return { order: existing, paymentUrl: existing.paymentUrl };
  }

  const orderId = `order-${randomUUID()}`;
  const amount = auction.currentBid;

  if (!isFapshiConfigured()) {
    const mockUrl = `${input.redirectUrl}?orderId=${orderId}&mock=1`;
    const order: PaymentOrder = {
      id: orderId,
      auctionId: input.auctionId,
      buyerId: input.buyerId,
      amount,
      status: "pending",
      fapshiTransId: `mock-${orderId}`,
      paymentUrl: mockUrl,
      createdAt: new Date().toISOString(),
      paidAt: null,
    };
    paymentOrders.push(order);
    await persistPaymentStore(paymentOrders, { critical: true });
    return { order, paymentUrl: mockUrl };
  }

  const fapshi = await initiatePay({
    amount,
    email: input.buyerEmail,
    redirectUrl: `${input.redirectUrl}?orderId=${orderId}`,
    userId: input.buyerId,
    externalId: orderId,
    message: `BidMarket — ${auction.product.title}`,
  });

  const order: PaymentOrder = {
    id: orderId,
    auctionId: input.auctionId,
    buyerId: input.buyerId,
    amount,
    status: "pending",
    fapshiTransId: fapshi.transId,
    paymentUrl: fapshi.link,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };

  paymentOrders.push(order);
  await persistPaymentStore(paymentOrders, { critical: true });
  return { order, paymentUrl: fapshi.link };
}
