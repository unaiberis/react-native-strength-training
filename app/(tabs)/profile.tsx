import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { ProfileScreen } from "@/features/profile/screens/ProfileScreen";

export default function ProfileRoute() {
  return (
    <ErrorBoundary>
      <ProfileScreen />
    </ErrorBoundary>
  );
}
