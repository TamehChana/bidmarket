"use client";

import { useEffect, useState } from "react";
import { SmartSearchExperience } from "@/components/ai/smart-search";
import { ApiUnavailable } from "@/components/layout/api-unavailable";
import type { Auction } from "@bidmarket/shared";
import { api } from "@/lib/api";

export function BrowsePageClient({ initialQuery = "" }: { initialQuery?: string }) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAuctions()
      .then(setAuctions)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load auctions");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 h-24 animate-pulse rounded-2xl bg-brand-muted" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[4/3] animate-pulse rounded-xl bg-brand-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ApiUnavailable message={error} />;
  }

  const liveCount = auctions.filter((auction) => auction.status === "live").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="section-label">
          {liveCount} live auction{liveCount === 1 ? "" : "s"}
        </p>
        <h1 className="mt-1 text-3xl font-normal tracking-tight">
          Browse auctions
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Search in plain language or filter by category. Sign in when you&apos;re
          ready to place a bid.
        </p>
      </div>

      <SmartSearchExperience auctions={auctions} initialQuery={initialQuery} />
    </div>
  );
}
