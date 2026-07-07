import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { list, put } from "@vercel/blob";
import type { Auction, Bid } from "@bidmarket/shared";
import { usesBlobStorage } from "./uploads.js";

const BLOB_PATHNAME = "data/marketplace-store.json";
const SNAPSHOT_CACHE_TTL_MS = 3_000;

let cachedSnapshot:
  | { snapshot: MarketplaceSnapshot; readAt: number }
  | null = null;

function invalidateSnapshotCache() {
  cachedSnapshot = null;
}

async function readSnapshot(): Promise<MarketplaceSnapshot | null> {
  if (
    cachedSnapshot &&
    Date.now() - cachedSnapshot.readAt < SNAPSHOT_CACHE_TTL_MS
  ) {
    return cachedSnapshot.snapshot;
  }

  const snapshot = usesBlobStorage()
    ? await readBlobSnapshot()
    : await readLocalSnapshot();

  if (snapshot) {
    cachedSnapshot = { snapshot, readAt: Date.now() };
  }

  return snapshot;
}

export interface MarketplaceSnapshot {
  auctions: Auction[];
  bids: Bid[];
}

function getLocalStorePath() {
  return path.join(process.cwd(), ".bidmarket-data", "marketplace-store.json");
}

async function readLocalSnapshot(): Promise<MarketplaceSnapshot | null> {
  try {
    const raw = await readFile(getLocalStorePath(), "utf8");
    return JSON.parse(raw) as MarketplaceSnapshot;
  } catch {
    return null;
  }
}

async function writeLocalSnapshot(snapshot: MarketplaceSnapshot) {
  const filePath = getLocalStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

async function readBlobSnapshot(): Promise<MarketplaceSnapshot | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const blob = blobs[0];
    if (!blob) {
      return null;
    }

    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as MarketplaceSnapshot;
  } catch (error) {
    console.error("Failed to read marketplace store from Blob:", error);
    return null;
  }
}

async function writeBlobSnapshot(snapshot: MarketplaceSnapshot) {
  await put(BLOB_PATHNAME, JSON.stringify(snapshot), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  invalidateSnapshotCache();
}

export function buildMarketplaceSnapshot(
  auctions: Auction[],
  bids: Bid[],
): MarketplaceSnapshot {
  return {
    auctions: [...auctions],
    bids: [...bids],
  };
}

function mergeSnapshot(
  auctions: Auction[],
  bids: Bid[],
  snapshot: MarketplaceSnapshot,
) {
  const auctionMap = new Map(auctions.map((auction) => [auction.id, auction]));
  for (const auction of snapshot.auctions) {
    auctionMap.set(auction.id, auction);
  }

  const bidMap = new Map(bids.map((bid) => [bid.id, bid]));
  for (const bid of snapshot.bids) {
    bidMap.set(bid.id, bid);
  }

  auctions.splice(0, auctions.length, ...auctionMap.values());
  bids.splice(0, bids.length, ...bidMap.values());
}

export async function refreshMarketplaceStore(
  auctions: Auction[],
  bids: Bid[],
) {
  try {
    const snapshot = await readSnapshot();

    if (snapshot?.auctions?.length) {
      mergeSnapshot(auctions, bids, snapshot);
      return;
    }

    if (auctions.length > 0) {
      await persistMarketplaceStore(auctions, bids);
    }
  } catch (error) {
    console.error("Failed to refresh marketplace store:", error);
  }
}

/** @deprecated Use refreshMarketplaceStore */
export function hydrateMarketplaceStore(
  auctions: Auction[],
  bids: Bid[],
): Promise<void> {
  return refreshMarketplaceStore(auctions, bids);
}

export async function persistMarketplaceStore(
  auctions: Auction[],
  bids: Bid[],
  options?: { critical?: boolean },
) {
  const snapshot = buildMarketplaceSnapshot(auctions, bids);

  try {
    if (usesBlobStorage()) {
      await writeBlobSnapshot(snapshot);
      return;
    }

    await writeLocalSnapshot(snapshot);
    invalidateSnapshotCache();
  } catch (error) {
    console.error("Failed to persist marketplace store:", error);
    if (options?.critical) {
      throw error;
    }
  }
}
