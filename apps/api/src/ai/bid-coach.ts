import type { Auction, Bid } from "@bidmarket/shared";
import { formatCurrency } from "@bidmarket/shared";
import { openAiChat } from "../openai.js";

export async function answerBidCoach(params: {
  auction: Auction;
  bids: Bid[];
  question: string;
}): Promise<string> {
  const { auction, bids, question } = params;
  const minimumNextBid =
    auction.bidCount === 0
      ? auction.startPrice
      : auction.currentBid + auction.bidIncrement;

  const bidSummary =
    bids.length === 0
      ? "No bids yet."
      : bids
          .slice(0, 8)
          .map(
            (bid) =>
              `${bid.userName}: ${formatCurrency(bid.amount)} at ${new Date(bid.createdAt).toLocaleString("en-CM")}`,
          )
          .join("\n");

  const context = [
    `Title: ${auction.product.title}`,
    `Category: ${auction.product.category}`,
    `Description: ${auction.product.description}`,
    `Status: ${auction.status}`,
    `Start price: ${formatCurrency(auction.startPrice)}`,
    `Current bid: ${formatCurrency(auction.currentBid)}`,
    `Bid count: ${auction.bidCount}`,
    `Minimum next bid: ${formatCurrency(minimumNextBid)}`,
    `Bid increment: ${formatCurrency(auction.bidIncrement)}`,
    `Ends at: ${new Date(auction.endsAt).toLocaleString("en-CM")}`,
    `Recent bids:\n${bidSummary}`,
  ].join("\n");

  return openAiChat({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful auction bidding coach for BidMarket in Cameroon. Prices are in XAF. Be concise (2-4 short paragraphs max), practical, and honest — you are not guaranteeing value. Explain auction dynamics clearly for beginners. Do not invent item details beyond the listing.",
      },
      {
        role: "user",
        content: `Auction context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.4,
  });
}
