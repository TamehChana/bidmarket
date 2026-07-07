"use client";

import { useCallback, useEffect, useState } from "react";
import type { Auction, Bid } from "@bidmarket/shared";
import { ApiError, api } from "@/lib/api";
import { readCachedAuction } from "@/lib/auction-cache";
import { useAuth } from "@/context/auth-context";

export type AuctionLoadKind = "outage" | "not-found" | null;

export function useAuction(auctionId: string) {
  const { token } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(() =>
    readCachedAuction(auctionId),
  );
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<AuctionLoadKind>(null);

  const refresh = useCallback(async () => {
    try {
      const nextAuction = await api.getAuction(auctionId, token);
      setAuction(nextAuction);
      setError(null);
      setErrorKind(null);

      try {
        const nextBids = await api.getAuctionBids(auctionId, token);
        setBids(nextBids);
      } catch {
        // Bid history is optional — keep showing the auction.
      }
    } catch (err) {
      const cached = readCachedAuction(auctionId);
      if (cached) {
        setAuction(cached);
        setError(null);
        setErrorKind(null);
        return;
      }

      if (err instanceof ApiError && err.status === 404) {
        setError(err.message);
        setErrorKind("not-found");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to load auction",
        );
        setErrorKind("outage");
      }
    } finally {
      setIsLoading(false);
    }
  }, [auctionId, token]);

  useEffect(() => {
    setIsLoading(!readCachedAuction(auctionId));
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh, auctionId]);

  return {
    auction,
    bids,
    isLoading,
    error,
    errorKind,
    refresh,
    setAuction,
    setBids,
  };
}
