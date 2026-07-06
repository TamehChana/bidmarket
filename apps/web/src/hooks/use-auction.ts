"use client";

import { useCallback, useEffect, useState } from "react";
import type { Auction, Bid } from "@bidmarket/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

export function useAuction(auctionId: string) {
  const { token } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextAuction, nextBids] = await Promise.all([
        api.getAuction(auctionId, token),
        api.getAuctionBids(auctionId, token),
      ]);
      setAuction(nextAuction);
      setBids(nextBids);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load auction");
    } finally {
      setIsLoading(false);
    }
  }, [auctionId, token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { auction, bids, isLoading, error, refresh, setAuction, setBids };
}
