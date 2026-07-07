import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { list, put } from "@vercel/blob";
import type { User } from "@bidmarket/shared";
import { usesBlobStorage } from "./uploads.js";

const BLOB_PATHNAME = "data/auth-store.json";

const SEED_EMAILS = new Set([
  "demo@bidmarket.com",
  "seller@bidmarket.com",
  "admin@bidmarket.com",
]);

const SEED_ACCOUNT_EMAILS = [...SEED_EMAILS];

export interface AuthStoreSnapshot {
  users: User[];
  passwords: Record<string, string>;
}

function getLocalAuthStorePath() {
  return path.join(process.cwd(), ".bidmarket-data", "auth-store.json");
}

function emptySnapshot(): AuthStoreSnapshot {
  return { users: [], passwords: {} };
}

async function readLocalSnapshot(): Promise<AuthStoreSnapshot> {
  try {
    const raw = await readFile(getLocalAuthStorePath(), "utf8");
    return JSON.parse(raw) as AuthStoreSnapshot;
  } catch {
    return emptySnapshot();
  }
}

async function writeLocalSnapshot(snapshot: AuthStoreSnapshot) {
  const filePath = getLocalAuthStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

async function readBlobSnapshot(): Promise<AuthStoreSnapshot> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const blob = blobs[0];
    if (!blob) {
      return emptySnapshot();
    }

    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) {
      return emptySnapshot();
    }

    return (await response.json()) as AuthStoreSnapshot;
  } catch (error) {
    console.error("Failed to read auth store from Blob:", error);
    return emptySnapshot();
  }
}

async function writeBlobSnapshot(snapshot: AuthStoreSnapshot) {
  try {
    await put(BLOB_PATHNAME, JSON.stringify(snapshot), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (error) {
    console.error("Failed to write auth store to Blob:", error);
  }
}

function sanitizeSnapshot(snapshot: AuthStoreSnapshot): AuthStoreSnapshot {
  const users = snapshot.users.filter(
    (user) => !SEED_EMAILS.has(user.email.toLowerCase()),
  );
  const passwords = Object.fromEntries(
    Object.entries(snapshot.passwords).filter(
      ([email]) => !SEED_EMAILS.has(email.toLowerCase()),
    ),
  );
  return { users, passwords };
}

export function applySeedPasswords(passwords: Map<string, string>) {
  const seedPassword = process.env.SEED_ACCOUNT_PASSWORD?.trim();
  if (!seedPassword) {
    return;
  }

  for (const email of SEED_ACCOUNT_EMAILS) {
    passwords.set(email, seedPassword);
  }
}

export function buildAuthSnapshot(
  users: User[],
  passwords: Map<string, string>,
): AuthStoreSnapshot {
  return sanitizeSnapshot({
    users: users.filter((user) => !SEED_EMAILS.has(user.email.toLowerCase())),
    passwords: Object.fromEntries(
      [...passwords.entries()].filter(
        ([email]) => !SEED_EMAILS.has(email.toLowerCase()),
      ),
    ),
  });
}

function findUserIndex(users: User[], email: string) {
  const normalized = email.toLowerCase();
  return users.findIndex((user) => user.email.toLowerCase() === normalized);
}

function mergeAuthSnapshot(
  users: User[],
  passwords: Map<string, string>,
  snapshot: AuthStoreSnapshot,
) {
  for (const user of snapshot.users) {
    const index = findUserIndex(users, user.email);
    if (index === -1) {
      users.push(user);
    } else if (!SEED_EMAILS.has(user.email.toLowerCase())) {
      users[index] = user;
    }
  }

  for (const [email, password] of Object.entries(snapshot.passwords)) {
    passwords.set(email.toLowerCase(), password);
  }
}

export async function refreshAuthStore(
  users: User[],
  passwords: Map<string, string>,
) {
  applySeedPasswords(passwords);

  try {
    const snapshot = usesBlobStorage()
      ? await readBlobSnapshot()
      : await readLocalSnapshot();

    mergeAuthSnapshot(users, passwords, snapshot);
  } catch (error) {
    console.error("Failed to refresh auth store:", error);
  }

  applySeedPasswords(passwords);
}

/** @deprecated Use refreshAuthStore — kept for startup compatibility */
export function hydrateAuthStore(
  users: User[],
  passwords: Map<string, string>,
): Promise<void> {
  return refreshAuthStore(users, passwords);
}

export async function persistAuthStore(
  users: User[],
  passwords: Map<string, string>,
) {
  const snapshot = buildAuthSnapshot(users, passwords);

  try {
    if (usesBlobStorage()) {
      await writeBlobSnapshot(snapshot);
      return;
    }

    await writeLocalSnapshot(snapshot);
  } catch (error) {
    console.error("Failed to persist auth store:", error);
  }
}

export async function upsertPersistedUser(
  users: User[],
  passwords: Map<string, string>,
  user: User,
  password?: string,
) {
  const index = findUserIndex(users, user.email);
  if (index === -1) {
    users.push(user);
  } else {
    users[index] = user;
  }

  if (password) {
    passwords.set(user.email.toLowerCase(), password);
  }

  if (!SEED_EMAILS.has(user.email.toLowerCase())) {
    await persistAuthStore(users, passwords);
  }
}
