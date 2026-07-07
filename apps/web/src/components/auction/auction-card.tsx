"use client";

import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@bidmarket/shared";
import type { Auction } from "@bidmarket/shared";
import { Badge } from "@/components/ui/badge";
import {
  formatTimeRemaining,
  getAuctionUrgency,
} from "@/lib/auction";
import { useLiveCountdown } from "@/components/auction/countdown-timer";
import { cn } from "@/lib/utils";

interface AuctionCardProps {
  auction: Auction;
  className?: string;
}

export function AuctionCard({ auction, className }: AuctionCardProps) {
  const remaining = useLiveCountdown(auction.endsAt);
  const urgency = getAuctionUrgency(auction.endsAt, auction.status);
  const image = auction.product.images[0];

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow duration-200 hover:card-elevated-hover",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-muted">
        {image ? (
          <Image
            src={image}
            alt={auction.product.title}
            fill
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : null}
        <div className="absolute left-3 top-3">
          <Badge variant={urgency === "urgent" ? "urgent" : "live"}>
            {urgency === "urgent" ? (
              "Ending soon"
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                Live
              </>
            )}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-muted">{auction.product.category}</p>
        <h3 className="mt-1 line-clamp-2 flex-1 text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-accent">
          {auction.product.title}
        </h3>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted">Current bid</p>
            <p className="mt-0.5 tabular-nums text-lg font-medium text-foreground">
              {formatCurrency(auction.currentBid)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Ends in</p>
            <p
              className={cn(
                "mt-0.5 tabular-nums text-sm font-medium",
                urgency === "urgent" ? "text-urgent" : "text-accent",
              )}
            >
              {remaining === null ? "—" : formatTimeRemaining(remaining)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function AuctionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-brand-muted" />
      <div className="space-y-3 p-4">
        <div className="h-2.5 w-16 animate-pulse rounded bg-brand-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-brand-muted" />
        <div className="flex justify-between border-t border-border pt-4">
          <div className="h-8 w-24 animate-pulse rounded bg-brand-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-brand-muted" />
        </div>
      </div>
    </div>
  );
}
