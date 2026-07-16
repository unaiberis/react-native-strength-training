import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { EditProfileScreen } from "@/features/profile/screens/EditProfileScreen";

export default function EditProfileRoute() {
  return (
    <ErrorBoundary>
      <EditProfileScreen />
    </ErrorBoundary>
  );
}
