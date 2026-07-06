import type {
  AdminPaymentOrder,
  AdminStats,
  AdminUser,
  Auction,
} from "@bidmarket/shared";
import { auctions, bids, findUserById, users } from "./store.js";
import { paymentOrders } from "./payments.js";

export function getAdminStats(): AdminStats {
  const liveAuctions = auctions.filter((a) => a.status === "live").length;
  const endedAuctions = auctions.filter((a) => a.status === "ended").length;
  const successfulPayments = paymentOrders.filter(
    (o) => o.status === "successful",
  );
  const pendingPayments = paymentOrders.filter(
    (o) => o.status === "pending",
  ).length;

  return {
    totalUsers: users.length,
    totalSellers: users.filter((u) => u.isSeller).length,
    liveAuctions,
    endedAuctions,
    totalBids: bids.length,
    pendingPayments,
    successfulPayments: successfulPayments.length,
    totalRevenue: successfulPayments.reduce((sum, o) => sum + o.amount, 0),
  };
}

export function getAdminUsers(): AdminUser[] {
  return users.map(({ id, email, name, roles, isSeller, isAdmin }) => ({
    id,
    email,
    name,
    roles,
    isSeller,
    isAdmin,
  }));
}

export function getAdminAuctions(): Auction[] {
  return [...auctions].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );
}

export function getAdminPayments(): AdminPaymentOrder[] {
  return paymentOrders
    .map((order) => {
      const auction = auctions.find((a) => a.id === order.auctionId);
      const buyer = findUserById(order.buyerId);
      return {
        ...order,
        auctionTitle: auction?.product.title ?? "Unknown auction",
        buyerName: buyer?.name ?? "Unknown buyer",
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function endAuctionEarly(auctionId: string): Auction {
  const auction = auctions.find((a) => a.id === auctionId);
  if (!auction) {
    throw new Error("Auction not found");
  }

  auction.status = "ended";
  auction.endsAt = new Date().toISOString();
  return auction;
}

export function removeAuction(auctionId: string): void {
  const index = auctions.findIndex((a) => a.id === auctionId);
  if (index === -1) {
    throw new Error("Auction not found");
  }
  auctions.splice(index, 1);
}

export function updateUserSellerRole(
  userId: string,
  isSeller: boolean,
): AdminUser {
  const user = findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.isAdmin) {
    throw new Error("Cannot change seller role for admin accounts");
  }

  user.isSeller = isSeller;
  if (isSeller && !user.roles.includes("seller")) {
    user.roles = [...user.roles, "seller"];
  } else if (!isSeller) {
    user.roles = user.roles.filter((role) => role !== "seller");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    isSeller: user.isSeller,
    isAdmin: user.isAdmin,
  };
}
