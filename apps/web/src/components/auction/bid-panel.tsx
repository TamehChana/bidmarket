"use client";

import { useEffect, useState } from "react";
import { formatCurrency, getMinimumBid } from "@bidmarket/shared";
import type { Auction } from "@bidmarket/shared";
import { Smartphone, Trophy } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/auction/countdown-timer";
import { isAuctionEnded } from "@/lib/auction";
import { cn } from "@/lib/utils";

interface BidPanelProps {
  auction: Auction;
  onBidPlaced?: (auction: Auction) => void;
  className?: string;
}

export function BidPanel({ auction, onBidPlaced, className }: BidPanelProps) {
  const { user, isAuthenticated, token } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [amount, setAmount] = useState(() => getMinimumBid(auction));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const minimumBid = getMinimumBid(auction);
  const ended = isAuctionEnded(auction);
  const isWinning = isAuthenticated && auction.highBidderId === user?.id;
  const isOutbid =
    isAuthenticated &&
    !isWinning &&
    auction.highBidderId !== null &&
    auction.bidCount > 0;

  useEffect(() => {
    setAmount(getMinimumBid(auction));
  }, [auction]);

  async function handlePlaceBid() {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.placeBid(auction.id, amount, token);
      onBidPlaced?.(response.auction);
      setMessage("Bid placed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card card-elevated",
        className,
      )}
    >
      <div className="bg-gradient-to-br from-accent/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Current bid</p>
            <p className="tabular-nums text-3xl font-semibold tracking-tight">
              {formatCurrency(auction.currentBid)}
            </p>
          </div>
          <Badge variant={ended ? "ended" : isWinning ? "winning" : "live"}>
            {ended ? "Ended" : isWinning ? "You're winning" : "Live"}
          </Badge>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">{auction.bidCount} bids placed</span>
          <span className="font-medium">
            <CountdownTimer endsAt={auction.endsAt} status={auction.status} />
          </span>
        </div>
      </div>

      <div className="border-t border-border p-5">
        {ended ? (
          <div className="space-y-4">
            {isWinning ? (
              <div className="rounded-xl border border-winning/20 bg-winning-muted p-4">
                <div className="flex items-start gap-3">
                  <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-winning" />
                  <div>
                    <p className="font-medium text-winning">You won this auction!</p>
                    <p className="mt-1 text-sm text-muted">
                      Complete payment with MTN MoMo or Orange Money to secure
                      your item.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-brand-muted p-4 text-sm">
                <p className="font-medium">This auction has ended.</p>
                <p className="mt-1 text-muted">
                  Browse more live auctions to keep bidding.
                </p>
              </div>
            )}
            {isWinning && isAuthenticated && token ? (
              <PayNowButton auctionId={auction.id} token={token} />
            ) : null}
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-brand-muted p-4">
              <p className="font-medium">Sign in to place a bid</p>
              <p className="mt-1 text-sm text-muted">
                Minimum next bid:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(minimumBid)}
                </span>
              </p>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() =>
                openAuthModal({
                  returnUrl: `/auctions/${auction.id}`,
                  intent: "bid",
                  auction,
                })
              }
            >
              Sign in to bid
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isWinning ? (
              <div className="rounded-xl border border-winning/20 bg-winning-muted p-4 text-sm text-winning">
                You&apos;re the highest bidder. We&apos;ll notify you if someone
                outbids you.
              </div>
            ) : null}

            {isOutbid ? (
              <div className="rounded-xl border border-outbid/20 bg-outbid-muted p-4 text-sm text-outbid">
                You&apos;ve been outbid. Place a higher bid to stay in the race.
              </div>
            ) : null}

            <div>
              <label htmlFor="bid-amount" className="mb-2 block text-sm font-medium">
                Your bid
              </label>
              <Input
                id="bid-amount"
                type="number"
                min={minimumBid}
                step={auction.bidIncrement}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
              <p className="mt-2 text-xs text-muted">
                Min. {formatCurrency(minimumBid)} · +{formatCurrency(auction.bidIncrement)} increments
              </p>
            </div>

            {error ? <p className="text-sm text-urgent">{error}</p> : null}
            {message ? <p className="text-sm text-winning">{message}</p> : null}

            <Button
              className="w-full"
              size="lg"
              disabled={isSubmitting || amount < minimumBid}
              onClick={handlePlaceBid}
            >
              {isSubmitting
                ? "Placing bid..."
                : `Place bid — ${formatCurrency(amount)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PayNowButton({
  auctionId,
  token,
}: {
  auctionId: string;
  token: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setIsLoading(true);
    setError(null);
    try {
      const { paymentUrl } = await api.initiatePayment(auctionId, token);
      window.location.href = paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsLoading(false);
    }
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-urgent">{error}</p> : null}
      <Button className="w-full gap-2" size="lg" disabled={isLoading} onClick={handlePay}>
        <Smartphone className="h-4 w-4" />
        {isLoading ? "Redirecting..." : "Pay with Mobile Money"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">
        MTN MoMo · Orange Money via Fapshi
      </p>
    </div>
  );
}
