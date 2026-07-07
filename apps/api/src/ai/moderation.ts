import type { Auction, ModerationResult } from "@bidmarket/shared";
import { openAiJson } from "../openai.js";

interface ModerationModel {
  verdict: "approve" | "review" | "reject";
  reasons: string[];
  confidence: number;
}

export async function moderateAuction(auction: Auction): Promise<ModerationResult> {
  const result = await openAiJson<ModerationModel>({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          'You moderate auction listings for BidMarket (Cameroon). Flag scams, misleading titles, prohibited items (weapons, drugs, counterfeit goods), spam, or unrealistic claims. Return JSON: verdict ("approve" | "review" | "reject"), reasons (string array, max 3), confidence (0-1). Use "review" when uncertain.',
      },
      {
        role: "user",
        content: [
          `Title: ${auction.product.title}`,
          `Category: ${auction.product.category}`,
          `Description: ${auction.product.description}`,
          `Start price (XAF): ${auction.startPrice}`,
          `Seller: ${auction.product.sellerName}`,
        ].join("\n"),
      },
    ],
  });

  const verdict =
    result.verdict === "reject" || result.verdict === "review"
      ? result.verdict
      : "approve";

  return {
    auctionId: auction.id,
    verdict,
    reasons: (result.reasons ?? []).slice(0, 3),
    confidence: Math.min(1, Math.max(0, Number(result.confidence) || 0.5)),
  };
}

export async function moderateAuctions(
  auctions: Auction[],
  auctionIds?: string[],
): Promise<ModerationResult[]> {
  const targets = auctionIds?.length
    ? auctions.filter((auction) => auctionIds.includes(auction.id))
    : auctions;

  return Promise.all(targets.map((auction) => moderateAuction(auction)));
}
