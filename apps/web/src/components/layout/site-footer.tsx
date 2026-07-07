import Link from "next/link";
import { Gavel } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-brand-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 text-lg font-medium text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Gavel className="h-4 w-4" />
              </span>
              BidMarket
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Cameroon&apos;s auction marketplace. Bid on curated items and pay
              securely with MTN MoMo or Orange Money via Fapshi.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["MTN MoMo", "Orange Money", "XAF"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Explore</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted">
              <Link href="/browse" className="transition-colors hover:text-accent">
                Browse auctions
              </Link>
              <Link href="/seller" className="transition-colors hover:text-accent">
                Start selling
              </Link>
              <Link href="/how-it-works" className="transition-colors hover:text-accent">
                How it works
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Account</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted">
              <Link href="/me/bids" className="transition-colors hover:text-accent">
                My Bids
              </Link>
              <Link href="/me/watchlist" className="transition-colors hover:text-accent">
                Watchlist
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} BidMarket. All rights reserved by
            WELABI JOEL DARYLL.
          </p>
          <p>Payments powered by Fapshi</p>
        </div>
      </div>
    </footer>
  );
}
