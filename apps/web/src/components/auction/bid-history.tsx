"use client";

import { formatCurrency } from "@bidmarket/shared";
import type { Bid } from "@bidmarket/shared";

interface BidHistoryProps {
  bids: Bid[];
}

export function BidHistory({ bids }: BidHistoryProps) {
  if (bids.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-brand-muted p-6 text-center">
        <p className="font-medium">No bids yet</p>
        <p className="mt-1 text-sm text-muted">Be the first to place a bid.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card card-elevated">
      <div className="border-b border-border bg-brand-muted/50 px-5 py-3.5">
        <h3 className="font-semibold">Bid history</h3>
        <p className="text-xs text-muted">{bids.length} bid{bids.length === 1 ? "" : "s"}</p>
      </div>
      <ul className="divide-y divide-border">
        {bids.map((bid, index) => (
          <li
            key={bid.id}
            className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm"
          >
            <div className="flex items-center gap-3">
              {index === 0 ? (
                <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
                  Leading
                </span>
              ) : null}
              <div>
                <p className="font-semibold tabular-nums">
                  {formatCurrency(bid.amount)}
                </p>
                <p className="text-muted">{bid.userName}</p>
              </div>
            </div>
            <time
              className="shrink-0 text-xs text-muted"
              suppressHydrationWarning
            >
              {new Date(bid.createdAt).toLocaleString("fr-CM", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
