import type { Auction } from "@bidmarket/shared";

const PREFIX = "bidmarket:auction:";

export function cacheAuction(auction: Auction) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(`${PREFIX}${auction.id}`, JSON.stringify(auction));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

export function readCachedAuction(auctionId: string): Auction | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${PREFIX}${auctionId}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Auction;
  } catch {
    return null;
  }
}
