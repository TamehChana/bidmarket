export const SESSION_PREFIX = "bm1.";

export type UserRole = "bidder" | "seller" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  isSeller: boolean;
  isAdmin: boolean;
}

type SessionPayload = SessionUser;

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  return atob(padded);
}

export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    isSeller: user.isSeller,
    isAdmin: user.isAdmin,
  };

  const json = JSON.stringify(payload);
  let encoded: string;

  if (typeof Buffer !== "undefined") {
    encoded = Buffer.from(json, "utf8").toString("base64url");
  } else {
    encoded = btoa(json)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  return `${SESSION_PREFIX}${encoded}`;
}

export function parseSessionToken(token: string): SessionUser | null {
  if (!token.startsWith(SESSION_PREFIX)) {
    return null;
  }

  try {
    const json = decodeBase64Url(token.slice(SESSION_PREFIX.length));
    const data = JSON.parse(json) as SessionPayload;
    if (!data.id || !data.email || !data.name) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      roles: data.roles ?? ["bidder"],
      isSeller: Boolean(data.isSeller),
      isAdmin: Boolean(data.isAdmin),
    };
  } catch {
    return null;
  }
}
