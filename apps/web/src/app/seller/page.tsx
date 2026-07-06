"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DollarSign, Gavel, Package, Plus } from "lucide-react";
import type { Auction } from "@bidmarket/shared";
import { formatCurrency } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimeRemaining } from "@/lib/auction";
import { useLiveCountdown } from "@/components/auction/countdown-timer";

interface SellerStats {
  activeListings: number;
  totalBids: number;
  totalRevenue: number;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isSeller, isLoading, token, user, becomeSeller } =
    useAuth();
  const { openAuthModal } = useAuthModal();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [becomingSeller, setBecomingSeller] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isSeller || !token) {
      setLoadingData(false);
      return;
    }

    Promise.all([api.getSellerAuctions(token), api.getSellerStats(token)])
      .then(([sellerAuctions, sellerStats]) => {
        setAuctions(sellerAuctions);
        setStats(sellerStats);
      })
      .finally(() => setLoadingData(false));
  }, [isAuthenticated, isSeller, token]);

  const handleBecomeSeller = async () => {
    setBecomingSeller(true);
    try {
      await becomeSeller();
    } finally {
      setBecomingSeller(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-brand-muted" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-3xl font-semibold">Seller Dashboard</h1>
        <p className="mt-3 text-muted">
          Sign in to list products and manage your auctions.
        </p>
        <Button
          className="mt-6"
          size="lg"
          onClick={() =>
            openAuthModal({ returnUrl: "/seller", intent: "general" })
          }
        >
          Sign in to continue
        </Button>
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Package className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold">Start selling on BidMarket</h1>
        <p className="mt-3 text-muted">
          List your products, set starting prices, and let bidders compete. You
          keep full control of your listings.
        </p>
        <Button
          className="mt-8"
          size="lg"
          onClick={handleBecomeSeller}
          disabled={becomingSeller}
        >
          {becomingSeller ? "Setting up..." : "Become a seller"}
        </Button>
        <p className="mt-4 text-xs text-muted">
          Free for MVP — no fees while we&apos;re in beta.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Seller Dashboard</h1>
          <p className="mt-2 text-muted">
            Welcome back, {user?.name}. Manage your live auctions.
          </p>
        </div>
        <Button onClick={() => router.push("/seller/listings/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New listing
        </Button>
      </div>

      {stats && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="Active listings"
            value={String(stats.activeListings)}
          />
          <StatCard
            icon={<Gavel className="h-5 w-5" />}
            label="Total bids received"
            value={String(stats.totalBids)}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Completed sales"
            value={formatCurrency(stats.totalRevenue)}
          />
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Your listings</h2>

        {loadingData ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl bg-brand-muted"
              />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-medium">No listings yet</p>
            <p className="mt-2 text-sm text-muted">
              Create your first auction and start receiving bids.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push("/seller/listings/new")}
            >
              Create listing
            </Button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
            {auctions.map((auction) => (
              <SellerListingRow key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-elevated">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SellerListingRow({ auction }: { auction: Auction }) {
  const remaining = useLiveCountdown(auction.endsAt);
  const isLive =
    auction.status === "live" && remaining !== null && remaining > 0;

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="flex flex-col gap-3 p-5 transition-colors hover:bg-brand-muted sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{auction.product.title}</p>
          <Badge variant={isLive ? "live" : "default"}>
            {isLive ? "Live" : auction.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {auction.product.category} · {auction.bidCount} bid
          {auction.bidCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <p className="text-muted">Current bid</p>
          <p className="font-semibold tabular-nums">
            {formatCurrency(auction.currentBid)}
          </p>
        </div>
        {isLive && remaining !== null ? (
          <div className="text-right">
            <p className="text-muted">Ends in</p>
            <p className="font-medium tabular-nums">
              {formatTimeRemaining(remaining)}
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
