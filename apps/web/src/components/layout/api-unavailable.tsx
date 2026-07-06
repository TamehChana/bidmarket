"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ApiUnavailable({
  message = "The auction API is not running.",
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-medium text-accent">Service unavailable</p>
      <h1 className="mt-2 text-2xl font-semibold">We can&apos;t load auctions right now</h1>
      <p className="mt-3 text-muted">{message}</p>
      <p className="mt-4 rounded-xl bg-brand-muted px-4 py-3 font-mono text-xs text-muted">
        npm run dev:api
      </p>
      <Button className="mt-6" onClick={() => window.location.reload()}>
        Retry
      </Button>
      <Link href="/how-it-works" className="mt-4 text-sm text-accent hover:text-accent-hover">
        How it works
      </Link>
    </div>
  );
}
