import { pb } from "./client";
import type { RecordModel } from "pocketbase";
import type { ProfileInput } from "../../shared/schemas/profile";

/**
 * Persist profile edits to the PocketBase `users` collection.
 *
 * Only non-undefined fields are sent (optional empties are omitted = unchanged).
 * Email is never sent (read-only / would require re-verification).
 */
export async function updateProfile(
  userId: string,
  data: Partial<ProfileInput>,
): Promise<RecordModel> {
  const payload: Record<string, unknown> = {};
  (Object.keys(data) as (keyof ProfileInput)[]).forEach((key) => {
    const value = data[key];
    if (value === undefined) return; // omit empty optional → unchanged
    payload[key] = value;
  });
  return pb.collection("users").update(userId, payload);
}
