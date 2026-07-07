import type {
  AiSearchFilters,
  AiSearchResponse,
  Auction,
} from "@bidmarket/shared";
import { cosineSimilarity, openAiEmbedding, openAiJson } from "../openai.js";

interface ParsedSearchQuery {
  interpretation: string;
  keywords: string[];
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  liveOnly?: boolean;
}

function matchesKeywords(auction: Auction, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }

  const haystack = [
    auction.product.title,
    auction.product.description,
    auction.product.category,
    auction.product.sellerName,
  ]
    .join(" ")
    .toLowerCase();

  return keywords.every((keyword) => haystack.includes(keyword.toLowerCase()));
}

function applyFilters(auctions: Auction[], filters: AiSearchFilters): Auction[] {
  return auctions.filter((auction) => {
    if (filters.liveOnly && auction.status !== "live") {
      return false;
    }
    if (filters.category && auction.product.category !== filters.category) {
      return false;
    }
    if (filters.maxPrice !== undefined && auction.currentBid > filters.maxPrice) {
      return false;
    }
    if (filters.minPrice !== undefined && auction.currentBid < filters.minPrice) {
      return false;
    }
    if (!matchesKeywords(auction, filters.keywords)) {
      return false;
    }
    return true;
  });
}

function auctionSearchText(auction: Auction): string {
  return [
    auction.product.title,
    auction.product.description,
    auction.product.category,
    auction.status,
    `price ${auction.currentBid} XAF`,
  ].join(". ");
}

async function rankByEmbedding(
  query: string,
  results: Auction[],
): Promise<Auction[]> {
  if (results.length <= 1) {
    return results;
  }

  const queryEmbedding = await openAiEmbedding(query);
  const scored = await Promise.all(
    results.map(async (auction) => ({
      auction,
      score: cosineSimilarity(
        queryEmbedding,
        await openAiEmbedding(auctionSearchText(auction)),
      ),
    })),
  );

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.auction);
}

export async function searchAuctions(
  query: string,
  auctions: Auction[],
): Promise<AiSearchResponse> {
  const parsed = await openAiJson<ParsedSearchQuery>({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          'Parse natural-language auction search queries for a Cameroon marketplace (XAF). Return JSON: interpretation (short sentence), keywords (array of lowercase terms to match in title/description — omit price/category words), optional category (exact: Art, Cameras, Collectibles, Electronics, Fashion, Furniture, Jewelry, Watches, Other), optional maxPrice/minPrice as integers in XAF, optional liveOnly boolean. "200k" means 200000.',
      },
      { role: "user", content: query },
    ],
  });

  const filters: AiSearchFilters = {
    keywords: (parsed.keywords ?? []).filter(Boolean),
    category: parsed.category,
    maxPrice: parsed.maxPrice,
    minPrice: parsed.minPrice,
    liveOnly: parsed.liveOnly,
  };

  let results = applyFilters(auctions, filters);

  if (results.length === 0 && filters.keywords.length > 0) {
    results = applyFilters(auctions, { ...filters, keywords: [] });
  }

  if (query.trim().length > 0 && results.length > 1) {
    results = await rankByEmbedding(query, results);
  }

  return {
    auctions: results,
    interpretation: parsed.interpretation || `Results for "${query}"`,
    filters,
  };
}
