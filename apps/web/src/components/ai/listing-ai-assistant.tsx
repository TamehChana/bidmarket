"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { ListingDraftResponse } from "@bidmarket/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ListingAiAssistantProps {
  token: string;
  imageUrl?: string;
  onApply: (draft: ListingDraftResponse, descriptionLang: "en" | "fr") => void;
}

export function ListingAiAssistant({
  token,
  imageUrl,
  onApply,
}: ListingAiAssistantProps) {
  const [keywords, setKeywords] = useState("");
  const [conditionHint, setConditionHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ListingDraftResponse | null>(null);

  async function handleGenerate() {
    if (!keywords.trim()) {
      setError("Add a few keywords about your item first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.generateListingDraft(
        {
          keywords: keywords.trim(),
          imageUrl: imageUrl || undefined,
          conditionHint: conditionHint.trim() || undefined,
        },
        token,
      );
      setDraft(result);
    } catch (err) {
      setDraft(null);
      setError(err instanceof Error ? err.message : "AI assistant failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-accent/20 bg-accent-muted/40 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium text-foreground">
            AI listing assistant
          </h2>
          <p className="mt-1 text-sm text-muted">
            Upload a photo, add keywords, and let AI draft your title,
            descriptions, category, and suggested prices.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="e.g. iPhone 13, good condition, 128GB"
        />
        <Input
          value={conditionHint}
          onChange={(event) => setConditionHint(event.target.value)}
          placeholder="Condition (optional)"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate with AI"
          )}
        </Button>
        {!imageUrl ? (
          <span className="self-center text-xs text-muted">
            Upload a photo for better results (Vision).
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-urgent">{error}</p>
      ) : null}

      {draft ? (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium">{draft.title}</p>
          <p className="mt-2 text-sm text-muted">{draft.descriptionEn}</p>
          <p className="mt-2 text-sm text-muted italic">{draft.descriptionFr}</p>
          <p className="mt-3 text-xs text-muted">
            {draft.category} · Start {draft.startPrice.toLocaleString()} XAF ·
            Increment {draft.bidIncrement.toLocaleString()} XAF
          </p>
          {draft.priceReasoning ? (
            <p className="mt-2 text-xs text-muted">{draft.priceReasoning}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onApply(draft, "en")}
            >
              Use English description
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onApply(draft, "fr")}
            >
              Use French description
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
