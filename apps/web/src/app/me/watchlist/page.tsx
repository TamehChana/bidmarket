"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { Button } from "@/components/ui/button";

export default function WatchlistPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuthModal } = useAuthModal();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-3xl font-semibold">Watchlist</h1>
        <p className="mt-3 text-muted">
          Sign in to save auctions and get notified before they end.
        </p>
        <Button
          className="mt-6"
          size="lg"
          onClick={() =>
            openAuthModal({ returnUrl: "/me/watchlist", intent: "watch" })
          }
        >
          Sign in to continue
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-3xl font-semibold">Watchlist</h1>
      <p className="mt-3 text-muted">
        Watchlist is scaffolded for MVP. Browse auctions and sign in to bid while
        we wire saved items next.
      </p>
      <Link
        href="/browse"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Browse auctions
      </Link>
    </div>
  );
}
