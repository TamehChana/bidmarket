import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { list, put } from "@vercel/blob";
import type { PaymentOrder } from "@bidmarket/shared";
import { usesBlobStorage } from "./uploads.js";

const BLOB_PATHNAME = "data/payment-store.json";
const SNAPSHOT_CACHE_TTL_MS = 3_000;

let cachedSnapshot:
  | { snapshot: PaymentSnapshot; readAt: number }
  | null = null;

export interface PaymentSnapshot {
  orders: PaymentOrder[];
}

function invalidateSnapshotCache() {
  cachedSnapshot = null;
}

function getLocalStorePath() {
  return path.join(process.cwd(), ".bidmarket-data", "payment-store.json");
}

async function readLocalSnapshot(): Promise<PaymentSnapshot | null> {
  try {
    const raw = await readFile(getLocalStorePath(), "utf8");
    return JSON.parse(raw) as PaymentSnapshot;
  } catch {
    return null;
  }
}

async function writeLocalSnapshot(snapshot: PaymentSnapshot) {
  const filePath = getLocalStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
  invalidateSnapshotCache();
}

async function readBlobSnapshot(): Promise<PaymentSnapshot | null> {
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

    return (await response.json()) as PaymentSnapshot;
  } catch (error) {
    console.error("Failed to read payment store from Blob:", error);
    return null;
  }
}

async function writeBlobSnapshot(snapshot: PaymentSnapshot) {
  await put(BLOB_PATHNAME, JSON.stringify(snapshot), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  invalidateSnapshotCache();
}

async function readSnapshot(): Promise<PaymentSnapshot | null> {
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

function mergeOrders(orders: PaymentOrder[], snapshot: PaymentSnapshot) {
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  for (const order of snapshot.orders) {
    orderMap.set(order.id, order);
  }
  orders.splice(0, orders.length, ...orderMap.values());
}

export async function refreshPaymentStore(orders: PaymentOrder[]) {
  try {
    const snapshot = await readSnapshot();
    if (snapshot?.orders?.length) {
      mergeOrders(orders, snapshot);
      return;
    }

    if (orders.length > 0) {
      await persistPaymentStore(orders);
    }
  } catch (error) {
    console.error("Failed to refresh payment store:", error);
  }
}

export async function persistPaymentStore(
  orders: PaymentOrder[],
  options?: { critical?: boolean },
) {
  const snapshot: PaymentSnapshot = { orders: [...orders] };

  try {
    if (usesBlobStorage()) {
      await writeBlobSnapshot(snapshot);
      return;
    }

    await writeLocalSnapshot(snapshot);
  } catch (error) {
    console.error("Failed to persist payment store:", error);
    if (options?.critical) {
      throw error;
    }
  }
}
