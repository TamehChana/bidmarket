"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Auction } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { api } from "@/lib/api";
import { AuctionCard, AuctionCardSkeleton } from "@/components/auction/auction-card";
import { Button } from "@/components/ui/button";

export default function MyBidsPage() {
  const { isAuthenticated, isLoading, token, user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingAuctions(false);
      return;
    }

    api
      .getAuctions(token)
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
            openAuthModal({ returnUrl: "/me/bids", intent: "general" })
          }
        >
          Sign in to continue
        </Button>
      </div>
    );
  }

  const active = auctions.filter((auction) => auction.status === "live");
  const winning = active.filter(
    (auction) => auction.highBidderId === user?.id,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">My Bids</h1>
        <p className="mt-2 text-muted">
          {winning.length > 0
            ? `You're currently winning ${winning.length} auction${winning.length === 1 ? "" : "s"}.`
            : "Track auctions you've bid on and jump back in quickly."}
        </p>
      </div>

      {loadingAuctions ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <AuctionCardSkeleton key={index} />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-medium">No active bids yet</p>
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
          {active.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
