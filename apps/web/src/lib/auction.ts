import type { Auction, AuctionStatus } from "@bidmarket/shared";

export function getTimeRemaining(endsAt: string): number {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) {
    return "Ended";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function getAuctionUrgency(
  endsAt: string,
  status: AuctionStatus,
): "live" | "urgent" | "ended" {
  if (status === "ended") {
    return "ended";
  }

  const remaining = getTimeRemaining(endsAt);
  if (remaining <= 5 * 60 * 1000) {
    return "urgent";
  }
  return "live";
}

export function isAuctionEnded(auction: Auction): boolean {
  return (
    auction.status === "ended" || getTimeRemaining(auction.endsAt) <= 0
  );
}
