import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { RecordModel } from "pocketbase";
import { useAuthStore } from "@/stores/auth-store";
import { updateProfile } from "@/lib/pocketbase/users";
import type { ProfileInput } from "@/shared/schemas/profile";

/**
 * Mutation hook that persists profile edits.
 *
 * - Online-only: throws when `isOnline === false` (the UI also disables Save).
 * - On success: refreshes the auth-store user, invalidates profile-stats
 *   queries, and navigates back to the Profile screen.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<RecordModel, Error, ProfileInput>({
    mutationFn: async (data) => {
      const { isOnline, user } = useAuthStore.getState();
      if (!isOnline) {
        throw new Error("You're offline — profile changes need a connection");
      }
      if (!user) throw new Error("Not authenticated");
      return updateProfile(user.id, data);
    },
    onSuccess: (updated) => {
      useAuthStore.getState().setUser(updated); // refresh store → ProfileScreen re-renders
      queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      router.back();
    },
  });
}
