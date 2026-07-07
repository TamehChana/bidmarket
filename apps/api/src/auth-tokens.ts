import type { User } from "@bidmarket/shared";
import { createSessionToken, parseSessionToken } from "@bidmarket/shared";

export { createSessionToken, parseSessionToken };

export function resolveUserFromToken(
  token: string,
  findUserById: (id: string) => User | undefined,
): User | undefined {
  const sessionUser = parseSessionToken(token);
  if (sessionUser) {
    const stored = findUserById(sessionUser.id);
    if (stored) {
      return stored;
    }
    return sessionUser;
  }

  if (token.startsWith("mock-token-")) {
    const userId = token.replace("mock-token-", "");
    return findUserById(userId);
  }

  return undefined;
}
