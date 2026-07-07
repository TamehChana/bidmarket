"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Auction } from "@bidmarket/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrowseGrid } from "@/components/auction/browse-grid";
import { AuctionCard } from "@/components/auction/auction-card";

interface SmartSearchExperienceProps {
  auctions: Auction[];
  initialQuery?: string;
  showCategoryFilters?: boolean;
}

export function SmartSearchExperience({
  auctions,
  initialQuery = "",
  showCategoryFilters = true,
}: SmartSearchExperienceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Auction[] | null>(null);

  useEffect(() => {
    if (initialQuery.trim()) {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await api.aiSearch(initialQuery.trim());
          setSearchResults(result.auctions);
          setInterpretation(result.interpretation);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Search failed");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [initialQuery]);

  async function handleSearch(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setInterpretation(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.aiSearch(trimmed);
      setSearchResults(result.auctions);
      setInterpretation(result.interpretation);
    } catch (err) {
      setSearchResults(null);
      setInterpretation(null);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const isSmartMode = searchResults !== null;

  return (
    <div>
      <form onSubmit={handleSearch} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Try "vintage camera under 200k" or "phone good condition"'
          className="h-12 rounded-full pl-12 pr-28 text-base shadow-sm"
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Search
            </>
          )}
        </Button>
      </form>

      {error ? <p className="mt-3 text-sm text-urgent">{error}</p> : null}

      {interpretation ? (
        <p className="mt-3 text-sm text-muted">
          <span className="font-medium text-foreground">AI:</span> {interpretation}
        </p>
      ) : null}

      {isSmartMode ? (
        <div className="mt-8">
          {searchResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <p className="font-medium">No auctions match that search</p>
              <p className="mt-1 text-sm text-muted">
                Try different keywords or browse all categories.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchResults(null);
                  setInterpretation(null);
                  setQuery("");
                }}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {searchResults.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          )}
        </div>
      ) : showCategoryFilters ? (
        <div className="mt-8">
          <BrowseGrid auctions={auctions} />
        </div>
      ) : null}
    </div>
  );
}

export function HeroSmartSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push("/browse");
      return;
    }
    router.push(`/browse?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative mt-8 max-w-xl">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder='Search auctions — e.g. "jewelry under 150k"'
        className="h-12 rounded-full pl-12 pr-28 text-base shadow-sm"
      />
      <Button
        type="submit"
        size="sm"
        className="absolute right-2 top-1/2 -translate-y-1/2"
      >
        <Sparkles className="mr-1.5 h-4 w-4" />
        Search
      </Button>
    </form>
  );
}
