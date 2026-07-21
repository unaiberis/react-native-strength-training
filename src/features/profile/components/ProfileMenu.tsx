import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "@lingui/core/macro";
import { Card } from "../../../shared/ui/Card";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProfileMenuProps {
  onNotifications: () => void;
  notificationUnreadCount?: number;
  onWellness: () => void;
  onHistory: () => void;
  onHelp: () => void;
  onSignOut: () => void;
}

// ─── Menu Item ──────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** When true, renders the label and icon in the danger colour. */
  danger?: boolean;
  /** Optional badge count shown next to the label. */
  badgeCount?: number;
}

function MenuItem({ icon, label, onPress, danger, badgeCount }: MenuItemProps) {
  const iconColor = danger ? "#D65F5F" : "#A4A4A8";
  const labelColor = danger
    ? "text-danger"
    : "text-surface-100";

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between py-4 px-1 border-b border-border last:border-b-0"
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={badgeCount ? `${label}, ${badgeCount} unread` : label}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text className={`text-[17px] font-medium ${labelColor}`}>
          {label}
        </Text>
        {badgeCount !== undefined && badgeCount > 0 && (
          <View className="bg-titanium rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
            <Text className="text-background text-[11px] font-extrabold">
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#707074" />
    </TouchableOpacity>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Menu list for the profile screen.
 *
 * Renders navigation items: Notifications, Wellness Dashboard,
 * Workout History, Help & Support, and Sign Out.
 * Each item has an Ionicons icon, label, and chevron-forward indicator.
 * Sign Out is rendered with danger styling.
 */
function ProfileMenu({
  onNotifications,
  notificationUnreadCount = 0,
  onWellness,
  onHistory,
  onHelp,
  onSignOut,
}: ProfileMenuProps) {
  return (
    <Card className="mb-4">
      <MenuItem
        icon="notifications-outline"
        label={t`Notifications`}
        onPress={onNotifications}
        badgeCount={notificationUnreadCount}
      />
      <MenuItem
        icon="heart-outline"
        label={t`Wellness Dashboard`}
        onPress={onWellness}
      />
      <MenuItem
        icon="time-outline"
        label={t`Workout History`}
        onPress={onHistory}
      />
      <MenuItem
        icon="help-circle-outline"
        label={t`Help & Support`}
        onPress={onHelp}
      />
      <MenuItem
        icon="log-out-outline"
        label={t`Sign Out`}
        onPress={onSignOut}
        danger
      />
    </Card>
  );
}

export { ProfileMenu };
export default ProfileMenu;
