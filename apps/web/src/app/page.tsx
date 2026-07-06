import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Gavel, Shield, Smartphone, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { AuctionCard } from "@/components/auction/auction-card";
import { ApiUnavailable } from "@/components/layout/api-unavailable";
import { buttonVariants } from "@/components/ui/button";
import { getTimeRemaining } from "@/lib/auction";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let auctions;
  try {
    auctions = await api.getAuctions();
  } catch {
    return <ApiUnavailable />;
  }

  const liveAuctions = auctions.filter((auction) => auction.status === "live");
  const endingSoon = [...liveAuctions]
    .sort(
      (a, b) => getTimeRemaining(a.endsAt) - getTimeRemaining(b.endsAt),
    )
    .slice(0, 3);
  const featuredAuction =
    endingSoon.find((auction) => getTimeRemaining(auction.endsAt) > 0) ??
    liveAuctions[0] ??
    null;
  const heroImage = featuredAuction?.product.images[0];
  const totalBids = auctions.reduce((n, a) => n + a.bidCount, 0);

  return (
    <div>
      <section className="hero-gradient border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 animate-fade-up lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-muted px-3.5 py-1.5 text-xs font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                {liveAuctions.length} live auction{liveAuctions.length === 1 ? "" : "s"} now
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
                Bid on things you love.
                <span className="mt-1 block text-accent">Highest bidder wins.</span>
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
                Browse live auctions across Cameroon, watch prices move in real
                time, and pay with MTN MoMo or Orange Money when you win.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/browse"
                  className={buttonVariants({
                    size: "lg",
                    className: "h-12 gap-2 px-6 text-base",
                  })}
                >
                  Browse live auctions
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className={buttonVariants({
                    variant: "secondary",
                    size: "lg",
                    className: "h-12 px-6 text-base",
                  })}
                >
                  How it works
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border/80 pt-8">
                {[
                  { value: String(liveAuctions.length), label: "Live now" },
                  { value: String(totalBids), label: "Total bids" },
                  { value: "XAF", label: "Local currency" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {heroImage && featuredAuction ? (
              <div className="relative order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none">
                <div className="relative overflow-hidden rounded-3xl bg-brand-muted card-elevated">
                  <Image
                    src={heroImage}
                    alt={featuredAuction.product.title}
                    width={800}
                    height={1000}
                    className="h-auto w-full object-cover"
                    priority
                    sizes="(max-width: 1024px) 448px, 50vw"
                  />
                  <div className="image-overlay pointer-events-none absolute inset-0" />
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-6 text-white">
                    <p className="section-label text-white/60">Ending soon</p>
                    <p className="mt-1 text-xl font-bold leading-snug">
                      {featuredAuction.product.title}
                    </p>
                    <Link
                      href={`/auctions/${featuredAuction.id}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 transition-colors hover:text-white"
                    >
                      View auction <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 z-20 rounded-2xl border border-border bg-card p-4 card-elevated">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted text-accent">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Pay on your phone</p>
                      <p className="text-xs text-muted">MTN & Orange Money</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="section-label">Closing soon</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Ending soon</h2>
            <p className="mt-1.5 text-muted">
              Don&apos;t miss auctions closing in the next few hours.
            </p>
          </div>
          <Link
            href="/browse"
            className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {endingSoon.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-label">Simple process</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">How it works</h2>
            <p className="mt-2 text-muted">
              Simple, transparent, and built for Cameroon.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Gavel,
                step: "01",
                title: "Browse",
                copy: "Explore live auctions without an account. Watch bids and countdowns in real time.",
              },
              {
                icon: Zap,
                step: "02",
                title: "Register to bid",
                copy: "Sign up from any product page and return instantly — no lost context.",
              },
              {
                icon: Shield,
                step: "03",
                title: "Win & pay",
                copy: "Highest bidder wins. Pay securely via Fapshi with MTN MoMo or Orange Money.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-0.5 hover:card-elevated-hover"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-accent/70">{item.step}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl brand-gradient px-8 py-10 sm:px-12 sm:py-14">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-brand-foreground">Ready to sell?</h2>
              <p className="mt-2 max-w-md text-brand-foreground/70">
                List your products, set your starting price, and let bidders
                compete. Free during beta.
              </p>
            </div>
            <Link
              href="/seller"
              className={buttonVariants({
                size: "lg",
                className: "h-12 shrink-0 bg-card text-accent hover:bg-accent-muted",
              })}
            >
              Start selling
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
