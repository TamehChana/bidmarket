"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Auction } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { api } from "@/lib/api";
import { AuctionCard, AuctionCardSkeleton } from "@/components/auction/auction-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MyBidsPage() {
  const { isAuthenticated, isLoading, token, user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoadingAuctions(false);
      return;
    }

    api
      .getMyBids(token)
      .then(setAuctions)
      .finally(() => setLoadingAuctions(false));
  }, [isAuthenticated, token]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <AuctionCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-3xl font-semibold">My Bids</h1>
        <p className="mt-3 text-muted">
          Sign in to track active bids, winning auctions, and past results.
        </p>
        <Button
          className="mt-6"
          size="lg"
          onClick={() =>
            openAuthModal({
              returnUrl: "/me/bids",
              intent: "general",
              defaultMode: "login",
            })
          }
        >
          Sign in to continue
        </Button>
      </div>
    );
  }

  const active = auctions.filter((auction) => auction.status === "live");
  const winning = auctions.filter(
    (auction) =>
      auction.status === "live" && auction.highBidderId === user?.id,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">My Bids</h1>
        <p className="mt-2 text-muted">
          {winning.length > 0
            ? `You're currently winning ${winning.length} auction${winning.length === 1 ? "" : "s"}.`
            : "Auctions you've placed bids on."}
        </p>
      </div>

      {loadingAuctions ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <AuctionCardSkeleton key={index} />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-medium">No bids yet</p>
          <p className="mt-2 text-sm text-muted">
            Browse live auctions and place your first bid.
          </p>
          <Link
            href="/browse"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Browse auctions
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((auction) => {
            const isWinning =
              auction.status === "live" && auction.highBidderId === user?.id;

            return (
              <div key={auction.id} className="relative">
                {isWinning ? (
                  <Badge variant="winning" className="absolute right-3 top-3 z-10">
                    Winning
                  </Badge>
                ) : null}
                <AuctionCard auction={auction} />
              </div>
            );
          })}
        </div>
      )}

      {active.length > 0 && auctions.length > active.length ? (
        <p className="mt-8 text-sm text-muted">
          Showing {auctions.length} auction{auctions.length === 1 ? "" : "s"} you&apos;ve bid on
          ({active.length} still live).
        </p>
      ) : null}
    </div>
  );
}
