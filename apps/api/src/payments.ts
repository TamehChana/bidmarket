import type { PaymentOrder, PaymentStatus } from "@bidmarket/shared";
import type { Auction } from "@bidmarket/shared";
import { auctions } from "./store.js";
import { initiatePay, isFapshiConfigured } from "./fapshi.js";

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

export function updateOrderStatus(
  orderId: string,
  status: PaymentStatus,
): PaymentOrder | undefined {
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
    }
  }

  return order;
}

export async function createPaymentOrder(input: {
  auctionId: string;
  buyerId: string;
  buyerEmail: string;
  redirectUrl: string;
}): Promise<{ order: PaymentOrder; paymentUrl: string }> {
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

  const orderId = `order-${paymentOrders.length + 1}`;
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
    return { order, paymentUrl: mockUrl };
  }

  const fapshi = await initiatePay({
    amount,
    email: input.buyerEmail,
    redirectUrl: input.redirectUrl,
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
  return { order, paymentUrl: fapshi.link };
}
