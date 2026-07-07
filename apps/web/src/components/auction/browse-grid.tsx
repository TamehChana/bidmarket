"use client";

import { useMemo, useState } from "react";
import type { Auction } from "@bidmarket/shared";
import { AuctionCard } from "@/components/auction/auction-card";
import { cn } from "@/lib/utils";

interface BrowseGridProps {
  auctions: Auction[];
}

export function BrowseGrid({ auctions }: BrowseGridProps) {
  const categories = useMemo(() => {
    const set = new Set(auctions.map((a) => a.product.category));
    return ["All", ...Array.from(set).sort()];
  }, [auctions]);

  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? auctions
      : auctions.filter((a) => a.product.category === activeCategory);

  const liveCount = filtered.filter((a) => a.status === "live").length;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeCategory === category
                ? "bg-accent text-accent-foreground"
                : "border border-border bg-card text-muted hover:bg-brand-muted hover:text-foreground",
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <p className="mb-6 mt-4 text-sm text-muted">
        <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
        auction{filtered.length === 1 ? "" : "s"}
        {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
        {liveCount > 0 && (
          <>
            {" "}
            · <span className="font-semibold text-live">{liveCount} live</span>
          </>
        )}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <p className="font-semibold text-foreground">No auctions in this category</p>
          <p className="mt-1.5 text-sm text-muted">Try another filter or check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </>
  );
}
