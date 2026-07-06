"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CreateListingRequest } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const CATEGORIES = [
  "Art",
  "Cameras",
  "Collectibles",
  "Electronics",
  "Fashion",
  "Furniture",
  "Jewelry",
  "Watches",
  "Other",
];

const DURATION_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "1 day" },
  { value: 48, label: "2 days" },
  { value: 72, label: "3 days" },
  { value: 168, label: "7 days" },
];

export default function NewListingPage() {
  const router = useRouter();
  const { isSeller, isLoading, token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CreateListingRequest>({
    title: "",
    description: "",
    category: "Other",
    imageUrl: "",
    startPrice: 50_000,
    bidIncrement: 5_000,
    durationHours: 24,
  });

  if (isLoading) {
    return null;
  }

  if (!isSeller) {
    router.replace("/seller");
    return null;
  }

  const updateField = <K extends keyof CreateListingRequest>(
    key: K,
    value: CreateListingRequest[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setError(null);
    setSubmitting(true);

    try {
      const auction = await api.createListing(form, token);
      router.push(`/auctions/${auction.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/seller"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-semibold">Create listing</h1>
      <p className="mt-2 text-muted">
        Set your product details and auction terms. Your listing goes live
        immediately.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field label="Title" required>
          <Input
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g. Vintage Leica M6 Film Camera"
            required
            maxLength={120}
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe condition, provenance, what's included..."
            maxLength={2000}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Image URL">
            <Input
              type="url"
              value={form.imageUrl}
              onChange={(e) => updateField("imageUrl", e.target.value)}
              placeholder="https://..."
            />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Start price (XAF)" required>
            <Input
              type="number"
              min={1}
              value={form.startPrice}
              onChange={(e) =>
                updateField("startPrice", Number(e.target.value))
              }
              required
            />
          </Field>

          <Field label="Bid increment (XAF)" required>
            <Input
              type="number"
              min={1}
              value={form.bidIncrement}
              onChange={(e) =>
                updateField("bidIncrement", Number(e.target.value))
              }
              required
            />
          </Field>

          <Field label="Duration" required>
            <Select
              value={form.durationHours}
              onChange={(e) =>
                updateField("durationHours", Number(e.target.value))
              }
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {error && (
          <p className="rounded-xl bg-urgent-muted px-4 py-3 text-sm text-urgent">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Publish auction"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/seller")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-urgent"> *</span>}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
