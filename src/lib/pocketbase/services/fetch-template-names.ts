import { pb } from "../client";

/**
 * Batch-fetch template names by IDs.
 * Deduplicates, skips empty/falsy filter, returns Map.
 * On error (filter too long, network) returns empty Map — callers degrade gracefully.
 */
export async function fetchTemplateNames(
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  try {
    const records = await pb.collection("workout_templates").getFullList({
      filter: unique.map((id) => `id='${id}'`).join("||"),
      fields: "id,name",
      requestKey: null,
    });
    const map = new Map<string, string>();
    for (const r of (records ?? []) as unknown as Array<{ id: string; name: string }>) {
      map.set(r.id, r.name);
    }
    return map;
  } catch {
    return new Map();
  }
}
