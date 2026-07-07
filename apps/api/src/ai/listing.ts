import type { ListingDraftRequest, ListingDraftResponse } from "@bidmarket/shared";
import { LISTING_CATEGORIES } from "@bidmarket/shared";
import { openAiJson } from "../openai.js";

interface ListingDraftModel {
  title: string;
  descriptionEn: string;
  descriptionFr: string;
  category: string;
  startPrice: number;
  bidIncrement: number;
  priceReasoning: string;
}

function normalizeCategory(value: string): ListingDraftResponse["category"] {
  const match = LISTING_CATEGORIES.find(
    (category) => category.toLowerCase() === value.toLowerCase(),
  );
  return match ?? "Other";
}

function roundToNearest(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

export async function generateListingDraft(
  input: ListingDraftRequest,
): Promise<ListingDraftResponse> {
  const userText = [
    `Keywords: ${input.keywords}`,
    input.conditionHint ? `Condition: ${input.conditionHint}` : null,
    "Market: Cameroon (prices in XAF).",
    `Valid categories: ${LISTING_CATEGORIES.join(", ")}.`,
    "Suggest realistic XAF start price and bid increment for this market.",
    "Write descriptionEn in English and descriptionFr in French.",
  ]
    .filter(Boolean)
    .join("\n");

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" } }
  > = [{ type: "text", text: userText }];

  if (input.imageUrl?.trim()) {
    userContent.push({
      type: "image_url",
      image_url: { url: input.imageUrl.trim(), detail: "low" },
    });
  }

  const draft = await openAiJson<ListingDraftModel>({
    model: input.imageUrl?.trim() ? "gpt-4o" : "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a marketplace listing assistant for BidMarket, an auction platform in Cameroon. Return JSON only with keys: title, descriptionEn, descriptionFr, category, startPrice, bidIncrement, priceReasoning. Keep titles under 100 characters. Prices must be positive integers in XAF.",
      },
      { role: "user", content: userContent },
    ],
  });

  const startPrice = roundToNearest(Number(draft.startPrice) || 50_000, 1_000);
  const bidIncrement = roundToNearest(
    Number(draft.bidIncrement) || 5_000,
    500,
  );

  return {
    title: draft.title?.trim() || "Untitled listing",
    descriptionEn: draft.descriptionEn?.trim() || "",
    descriptionFr: draft.descriptionFr?.trim() || "",
    category: normalizeCategory(draft.category ?? "Other"),
    startPrice,
    bidIncrement,
    priceReasoning: draft.priceReasoning?.trim() || "",
  };
}
