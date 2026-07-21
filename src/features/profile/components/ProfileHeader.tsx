import { View, Text } from "react-native";
import { t } from "@lingui/core/macro";
import { Avatar } from "../../../shared/ui/Avatar";
import { Button } from "../../../shared/ui/Button";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  name: string;
  email: string;
  onEdit: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Large profile header with avatar (80px, initials or photo),
 * display name, email, and an "Edit Profile" ghost button.
 */
function ProfileHeader({ name, email, onEdit }: ProfileHeaderProps) {
  return (
    <View className="items-center mb-6">
      <Avatar
        name={name}
        size="xl"
        className="mb-4"
      />

      <Text className="text-[34px] font-black tracking-[-0.8] text-surface-50 text-center">
        {name}
      </Text>

      <Text className="text-surface-500 text-sm mt-1 mb-4 text-center">
        {email}
      </Text>

      <Button
        title={t`Edit Profile`}
        variant="ghost"
        size="sm"
        icon="person-outline"
        onPress={onEdit}
      />
    </View>
  );
}

export { ProfileHeader };
export default ProfileHeader;
