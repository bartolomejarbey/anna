import "server-only";

import { randomBytes } from "crypto";

/**
 * URL-safe token (32 bytes → 43 znaků base64url).
 * Použití: /plan/<token> — žádné jméno zákazníka v URL.
 */
export function generateAccessToken(): string {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
