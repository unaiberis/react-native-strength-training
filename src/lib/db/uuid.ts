/**
 * UUID generation for local SQLite records.
 *
 * Uses `crypto.randomUUID()` natively when available (Hermes 0.76+),
 * falls back to the `uuid` v4 package for older runtimes.
 */

import { v4 as uuidv4 } from "uuid";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a UUID v4 string.
 *
 * Prefers the native `crypto.randomUUID()` API when available,
 * otherwise falls back to the `uuid` package's v4 implementation.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return uuidv4();
}

/**
 * Check whether a string is a valid UUID v4.
 */
export function isValidId(id: string): boolean {
  return UUID_V4_REGEX.test(id);
}
