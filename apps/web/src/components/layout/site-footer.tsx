import Link from "next/link";
import { Gavel } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="brand-gradient mt-auto text-brand-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <Gavel className="h-4 w-4" />
              </span>
              BidMarket
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-foreground/70">
              Cameroon&apos;s premium auction marketplace. Bid on curated items,
              pay securely with MTN MoMo or Orange Money via Fapshi.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["MTN MoMo", "Orange Money", "XAF"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-foreground/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="section-label text-brand-foreground/50">Explore</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-brand-foreground/75">
              <Link href="/browse" className="transition-colors hover:text-white">
                Browse auctions
              </Link>
              <Link href="/seller" className="transition-colors hover:text-white">
                Start selling
              </Link>
              <Link href="/how-it-works" className="transition-colors hover:text-white">
                How it works
              </Link>
            </div>
          </div>

          <div>
            <p className="section-label text-brand-foreground/50">Account</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-brand-foreground/75">
              <Link href="/me/bids" className="transition-colors hover:text-white">
                My Bids
              </Link>
              <Link href="/me/watchlist" className="transition-colors hover:text-white">
                Watchlist
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-brand-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BidMarket. All rights reserved.</p>
          <p>Payments powered by Fapshi</p>
        </div>
      </div>
    </footer>
  );
}
