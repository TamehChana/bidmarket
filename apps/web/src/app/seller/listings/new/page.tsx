"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ImagePlus, Package, X } from "lucide-react";
import type { CreateListingRequest, ListingDraftResponse } from "@bidmarket/shared";
import { LISTING_CATEGORIES } from "@bidmarket/shared";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { cacheAuction } from "@/lib/auction-cache";
import { ListingAiAssistant } from "@/components/ai/listing-ai-assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const CATEGORIES = [...LISTING_CATEGORIES];

const DURATION_PRESETS = [
  { value: 2, label: "2 min" },
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 360, label: "6 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "1 day" },
  { value: 2880, label: "2 days" },
  { value: 4320, label: "3 days" },
  { value: 10_080, label: "7 days" },
] as const;

const MIN_DURATION_MINUTES = 2;
const MAX_DURATION_MINUTES = 10_080;

export default function NewListingPage() {
  const router = useRouter();
  const { isSeller, isLoading, isAuthenticated, token, becomeSeller } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [becomingSeller, setBecomingSeller] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CreateListingRequest>({
    title: "",
    description: "",
    category: "Other",
    imageUrl: "",
    startPrice: 50_000,
    bidIncrement: 5_000,
    durationMinutes: 1440,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-brand-muted" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace("/seller");
    return null;
  }

  if (!isSeller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Package className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold">Seller account required</h1>
        <p className="mt-3 text-muted">
          Enable selling on your account before publishing a listing.
        </p>
        <Button
          className="mt-8"
          size="lg"
          disabled={becomingSeller}
          onClick={async () => {
            setBecomingSeller(true);
            setError(null);
            try {
              await becomeSeller();
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Could not enable seller account",
              );
            } finally {
              setBecomingSeller(false);
            }
          }}
        >
          {becomingSeller ? "Setting up..." : "Become a seller"}
        </Button>
        {error ? <p className="mt-4 text-sm text-urgent">{error}</p> : null}
        <Link
          href="/seller"
          className="mt-6 inline-block text-sm text-accent hover:text-accent-hover"
        >
          Back to seller dashboard
        </Link>
      </div>
    );
  }

  const updateField = <K extends keyof CreateListingRequest>(
    key: K,
    value: CreateListingRequest[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const clearImage = () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    updateField("imageUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !token) {
      return;
    }

    setError(null);
    setUploadingImage(true);

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const { url } = await api.uploadListingImage(file, token);
      updateField("imageUrl", url);
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
    } catch (err) {
      setPreviewUrl(null);
      updateField("imageUrl", "");
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  function applyAiDraft(draft: ListingDraftResponse, descriptionLang: "en" | "fr") {
    setForm((prev) => ({
      ...prev,
      title: draft.title,
      description:
        descriptionLang === "fr" ? draft.descriptionFr : draft.descriptionEn,
      category: draft.category,
      startPrice: draft.startPrice,
      bidIncrement: draft.bidIncrement,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setError(null);
    setSubmitting(true);

    try {
      const auction = await api.createListing(form, token);
      cacheAuction(auction);
      router.push(`/auctions/${auction.id}?published=1`);
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
        {token ? (
          <ListingAiAssistant
            token={token}
            imageUrl={form.imageUrl || previewUrl || undefined}
            onApply={applyAiDraft}
          />
        ) : null}

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

          <Field label="Image URL (optional)">
            <Input
              type="url"
              value={previewUrl ? "" : form.imageUrl}
              onChange={(e) => {
                clearImage();
                updateField("imageUrl", e.target.value);
              }}
              placeholder="https://... or upload below"
              disabled={uploadingImage}
            />
          </Field>
        </div>

        <Field label="Product photo">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleImageSelect}
            disabled={uploadingImage}
          />

          {previewUrl || form.imageUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-brand-muted">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={previewUrl ?? form.imageUrl}
                  alt="Listing preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
                <p className="text-sm text-muted">
                  {uploadingImage ? "Uploading..." : "Photo ready"}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearImage}
                    disabled={uploadingImage}
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center transition-colors hover:border-accent hover:bg-accent-muted/30 disabled:opacity-60"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted text-accent">
                <ImagePlus className="h-6 w-6" />
              </span>
              <span className="font-medium">Upload from your device</span>
              <span className="text-sm text-muted">
                JPG, PNG, WebP, or GIF · up to 5 MB
              </span>
            </button>
          )}
        </Field>

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
            <Input
              type="number"
              min={MIN_DURATION_MINUTES}
              max={MAX_DURATION_MINUTES}
              value={form.durationMinutes}
              onChange={(e) =>
                updateField(
                  "durationMinutes",
                  Math.min(
                    MAX_DURATION_MINUTES,
                    Math.max(MIN_DURATION_MINUTES, Number(e.target.value) || MIN_DURATION_MINUTES),
                  ),
                )
              }
              required
            />
            <p className="mt-1.5 text-xs text-muted">
              Minimum 2 minutes · maximum 7 days ({MAX_DURATION_MINUTES.toLocaleString()} min)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => updateField("durationMinutes", preset.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.durationMinutes === preset.value
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border bg-card text-muted hover:border-accent hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {error && (
          <p className="rounded-xl bg-urgent-muted px-4 py-3 text-sm text-urgent">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting || uploadingImage}>
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
