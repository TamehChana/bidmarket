"use client";

import { useState } from "react";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import type { Auction } from "@bidmarket/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Summarize this listing",
  "Is this a fair price?",
  "What should I bid next?",
];

interface BidCoachPanelProps {
  auction: Auction;
}

export function BidCoachPanel({ auction }: BidCoachPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setQuestion(trimmed);
    setLoading(true);
    setError(null);
    try {
      const result = await api.askBidCoach(auction.id, trimmed);
      setAnswer(result.answer);
    } catch (err) {
      setAnswer(null);
      setError(err instanceof Error ? err.message : "Bid coach unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5 card-elevated">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-medium">Ask about this item</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        AI bidding coach — get a quick read on price, strategy, and listing
        details. Not financial advice.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => ask(suggestion)}
            className="rounded-full border border-border bg-brand-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:bg-accent-muted"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask anything about this auction..."
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <Button type="submit" disabled={loading || !question.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Ask
            </>
          )}
        </Button>
      </form>

      {error ? <p className="mt-3 text-sm text-urgent">{error}</p> : null}

      {answer ? (
        <div className="mt-4 rounded-lg bg-brand-muted p-4 text-sm leading-6 text-foreground">
          {answer}
        </div>
      ) : null}
    </section>
  );
}
