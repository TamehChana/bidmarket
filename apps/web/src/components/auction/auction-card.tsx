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
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card card-elevated transition-all duration-300 hover:-translate-y-1 hover:card-elevated-hover",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-muted">
        {image ? (
          <Image
            src={image}
            alt={auction.product.title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : null}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent" />
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
        <p className="section-label">{auction.product.category}</p>
        <h3 className="mt-1.5 line-clamp-2 flex-1 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-accent">
          {auction.product.title}
        </h3>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/80 pt-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Current bid
            </p>
            <p className="mt-0.5 tabular-nums text-lg font-bold text-foreground">
              {formatCurrency(auction.currentBid)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Ends in
            </p>
            <p
              className={cn(
                "mt-0.5 tabular-nums text-sm font-bold",
                urgency === "urgent" ? "text-urgent" : "text-brand",
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card card-elevated">
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
