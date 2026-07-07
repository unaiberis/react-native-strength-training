import { ErrorBoundary } from "../../src/shared/ui/ErrorBoundary";
import { ProfileScreen } from "../../src/features/profile/screens/ProfileScreen";

export default function ProfileRoute() {
  return (
    <ErrorBoundary>
      <ProfileScreen />
    </ErrorBoundary>
  );
}
