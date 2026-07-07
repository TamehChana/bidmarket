"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type UnavailableKind = "outage" | "not-found";

const COPY: Record<
  UnavailableKind,
  { label: string; title: string; defaultMessage: string }
> = {
  outage: {
    label: "Service unavailable",
    title: "We can't load auctions right now",
    defaultMessage: "Auction data could not be loaded.",
  },
  "not-found": {
    label: "Not found",
    title: "This auction isn't available yet",
    defaultMessage:
      "It may still be publishing. Wait a moment and try again.",
  },
};

export function ApiUnavailable({
  kind = "outage",
  message,
}: {
  kind?: UnavailableKind;
  message?: string;
}) {
  const copy = COPY[kind];

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-medium text-accent">{copy.label}</p>
      <h1 className="mt-2 text-2xl font-semibold">{copy.title}</h1>
      <p className="mt-3 text-muted">{message ?? copy.defaultMessage}</p>
      <Button className="mt-6" onClick={() => window.location.reload()}>
        Retry
      </Button>
      {kind === "not-found" ? (
        <Link href="/browse" className="mt-4 text-sm text-accent hover:text-accent-hover">
          Browse auctions
        </Link>
      ) : (
        <Link href="/how-it-works" className="mt-4 text-sm text-accent hover:text-accent-hover">
          How it works
        </Link>
      )}
    </div>
  );
}
