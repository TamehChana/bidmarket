"use client";

import Image from "next/image";
import { useState } from "react";
import type { Auction } from "@bidmarket/shared";
import { BidPanel } from "@/components/auction/bid-panel";
import { BidHistory } from "@/components/auction/bid-history";
import { BidCoachPanel } from "@/components/ai/bid-coach-panel";
import { Badge } from "@/components/ui/badge";
import { useAuction } from "@/hooks/use-auction";

interface AuctionDetailClientProps {
  initialAuction: Auction;
}

export function AuctionDetailClient({
  initialAuction,
}: AuctionDetailClientProps) {
  const { auction, bids, isLoading, setAuction } = useAuction(initialAuction.id);
  const [activeImage, setActiveImage] = useState(0);
  const currentAuction = auction ?? initialAuction;
  const images = currentAuction.product.images;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-border bg-brand-muted card-elevated">
            <div className="relative aspect-[4/3]">
              {images[activeImage] ? (
                <Image
                  src={images[activeImage]}
                  alt={currentAuction.product.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              ) : null}
            </div>
          </div>

          {images.length > 1 ? (
            <div className="mt-3 flex gap-3">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`relative h-20 w-20 overflow-hidden rounded-xl border ${
                    activeImage === index
                      ? "border-accent"
                      : "border-border"
                  }`}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{currentAuction.product.category}</Badge>
              <Badge variant="live">
                <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                Live auction
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {currentAuction.product.title}
              </h1>
              <p className="mt-2 text-muted">
                Sold by {currentAuction.product.sellerName}
              </p>
            </div>
            <div className="prose max-w-none">
              <p className="text-base leading-7 text-foreground">
                {currentAuction.product.description}
              </p>
            </div>
            <BidCoachPanel auction={currentAuction} />
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <BidPanel
            auction={currentAuction}
            onBidPlaced={setAuction}
            className="lg:shadow-md"
          />
        </div>
      </div>

      <div className="mt-10">
        <BidHistory bids={bids} />
        {isLoading ? (
          <p className="mt-2 text-xs text-muted">Refreshing auction data...</p>
        ) : null}
      </div>
    </div>
  );
}
