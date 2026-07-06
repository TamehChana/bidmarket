import { api } from "@/lib/api";
import { BrowseGrid } from "@/components/auction/browse-grid";
import { ApiUnavailable } from "@/components/layout/api-unavailable";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  let auctions;
  try {
    auctions = await api.getAuctions();
  } catch {
    return <ApiUnavailable />;
  }

  const liveCount = auctions.filter((a) => a.status === "live").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="section-label">
          {liveCount} live auction{liveCount === 1 ? "" : "s"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Browse auctions
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Explore live listings across categories. Sign in when you&apos;re ready
          to place a bid.
        </p>
      </div>

      <BrowseGrid auctions={auctions} />
    </div>
  );
}
