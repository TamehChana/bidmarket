"use client";

import { AuctionDetailClient } from "@/components/auction/auction-detail-client";
import { ApiUnavailable } from "@/components/layout/api-unavailable";
import { useAuction } from "@/hooks/use-auction";

export function AuctionDetailLoader({ auctionId }: { auctionId: string }) {
  const { auction, isLoading, error, errorKind } = useAuction(auctionId);

  if (isLoading && !auction) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-brand-muted" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-brand-muted" />
          <div className="h-80 animate-pulse rounded-2xl bg-brand-muted" />
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <ApiUnavailable
        kind={errorKind === "not-found" ? "not-found" : "outage"}
        message={
          error ??
          "This auction could not be found. It may still be publishing — try again in a moment."
        }
      />
    );
  }

  return <AuctionDetailClient initialAuction={auction} />;
}
