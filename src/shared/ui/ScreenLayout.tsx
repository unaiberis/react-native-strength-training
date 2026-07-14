import { type ReactNode, type ReactElement } from "react";
import {
  View,
  ScrollView,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientBackground } from "./GradientBackground";
import { ErrorBoundary } from "./ErrorBoundary";
import { ScreenTitle } from "./ScreenTitle";
import { KickerLabel } from "./KickerLabel";
import { SkeletonCard } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ScreenLayoutProps {
  /** Screen title — renders ScreenTitle component */
  title?: string;
  /** Subtitle rendered below the title */
  subtitle?: string;
  /** Kicker text rendered above the title via KickerLabel */
  kicker?: string;
  /** Layout mode — default "scroll" */
  mode?: "scroll" | "flatlist" | "none";
  /** Show loading skeleton */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Label for the retry button — default "Retry" */
  errorLabel?: string;
  /** Called when retry button is pressed */
  onRetry?: () => void;
  /** Show empty state */
  empty?: boolean;
  /** Icon name for empty state */
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  /** Title for empty state */
  emptyTitle?: string;
  /** Subtitle for empty state */
  emptySubtitle?: string;
  /** Action button for empty state */
  emptyAction?: { label: string; onPress: () => void };
  /** Pull-to-refresh handler */
  onRefresh?: () => void;
  /** Pull-to-refresh refreshing flag */
  refreshing?: boolean;
  /** Apply horizontal padding (px-4) — default true */
  padded?: boolean;
  /** Additional class name for the root wrapper */
  className?: string;
  /** Children for scroll/none modes */
  children?: ReactNode;
  /** FlatList data array */
  data?: any[];
  /** FlatList renderItem */
  renderItem?: (info: { item: any; index: number }) => ReactElement | null;
  /** FlatList keyExtractor */
  keyExtractor?: (item: any, index: number) => string;
  /** FlatList onEndReached */
  onEndReached?: () => void;
  /** FlatList onEndReachedThreshold */
  onEndReachedThreshold?: number;
  /** FlatList ListHeaderComponent */
  ListHeaderComponent?: ReactElement;
  /** FlatList ListFooterComponent */
  ListFooterComponent?: ReactElement;
}

// ─── Error State ───────────────────────────────────────────────────────────

function ErrorState({
  message,
  label,
  onRetry,
}: {
  message: string;
  label?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-16 h-16 rounded-full bg-danger/20 items-center justify-center mb-4">
        <Text className="text-danger text-3xl">!</Text>
      </View>
      <Text className="text-surface-50 text-lg font-bold mb-2 text-center">
        Something went wrong
      </Text>
      <Text className="text-surface-400 text-sm text-center mb-4 leading-5">
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="bg-card border border-border rounded-xl px-6 py-3 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={label ?? "Retry"}
        >
          <Text className="text-surface-50 font-semibold">{label ?? "Retry"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── ScreenLayout ──────────────────────────────────────────────────────────

function ScreenLayout({
  title,
  subtitle,
  kicker,
  mode = "scroll",
  loading = false,
  error,
  errorLabel,
  onRetry,
  empty = false,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  emptyAction,
  onRefresh,
  refreshing = false,
  padded = true,
  className,
  children,
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold,
  ListHeaderComponent,
  ListFooterComponent,
}: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 64);

  // ─── State priority: loading > error > empty > content ─────────────────

  const showLoading = loading && !error;
  const showError = !!error;
  const showEmpty = !loading && !error && empty;
  const showContent = !loading && !error && !empty;

  // ─── Header (title + kicker) ──────────────────────────────────────────

  const header = (
    <>
      {kicker && <KickerLabel className="mb-2">{kicker}</KickerLabel>}
      {title && <ScreenTitle title={title} subtitle={subtitle} />}
    </>
  );

  // ─── Bottom spacer ─────────────────────────────────────────────────────

  const bottomSpacer = <View className="h-8" />;

  // ─── ScrollView mode ───────────────────────────────────────────────────

  if (mode === "scroll") {
    return (
      <GradientBackground>
        <ErrorBoundary>
          <View
            className={`flex-1 ${className ?? ""}`}
            style={{ paddingTop: topPadding }}
          >
            {showLoading && (
              <View className="flex-1 px-4">
                <SkeletonCard lines={3} />
              </View>
            )}

            {showError && (
              <View className="flex-1">
                <ErrorState
                  message={error ?? "An unexpected error occurred."}
                  label={errorLabel}
                  onRetry={onRetry}
                />
              </View>
            )}

            {showEmpty && (
              <View className="flex-1">
                <EmptyState
                  icon={emptyIcon}
                  title={emptyTitle ?? "No data"}
                  subtitle={emptySubtitle}
                  action={emptyAction}
                />
              </View>
            )}

            {showContent && (
              <ScrollView
                className={padded ? "flex-1 px-4" : "flex-1"}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  onRefresh ? (
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor="#B9B9B6"
                    />
                  ) : undefined
                }
              >
                {header}
                {children}
                {bottomSpacer}
              </ScrollView>
            )}
          </View>
        </ErrorBoundary>
      </GradientBackground>
    );
  }

  // ─── FlatList mode ─────────────────────────────────────────────────────

  if (mode === "flatlist") {
    return (
      <GradientBackground>
        <ErrorBoundary>
          <View
            className={`flex-1 ${className ?? ""}`}
            style={{ paddingTop: topPadding }}
          >
            {showLoading && (
              <View className="flex-1 px-4">
                <SkeletonCard lines={3} />
              </View>
            )}

            {showError && (
              <View className="flex-1">
                <ErrorState
                  message={error ?? "An unexpected error occurred."}
                  label={errorLabel}
                  onRetry={onRetry}
                />
              </View>
            )}

            {showEmpty && (
              <View className="flex-1">
                <EmptyState
                  icon={emptyIcon}
                  title={emptyTitle ?? "No data"}
                  subtitle={emptySubtitle}
                  action={emptyAction}
                />
              </View>
            )}

            {showContent && (
              <FlatList
                className={padded ? "flex-1 px-4" : "flex-1"}
                data={data}
                renderItem={renderItem as any}
                keyExtractor={keyExtractor}
                onEndReached={onEndReached}
                onEndReachedThreshold={onEndReachedThreshold}
                ListHeaderComponent={
                  <>
                    {header}
                    {ListHeaderComponent}
                  </>
                }
                ListFooterComponent={
                  <>
                    {ListFooterComponent}
                    {bottomSpacer}
                  </>
                }
                showsVerticalScrollIndicator={false}
                refreshControl={
                  onRefresh ? (
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor="#B9B9B6"
                    />
                  ) : undefined
                }
              />
            )}
          </View>
        </ErrorBoundary>
      </GradientBackground>
    );
  }

  // ─── None mode (no scroll container) ───────────────────────────────────

  return (
    <GradientBackground>
      <ErrorBoundary>
        <View
          className={`flex-1 ${className ?? ""}`}
          style={{ paddingTop: topPadding }}
        >
          {showLoading && (
            <View className="flex-1 px-4">
              <SkeletonCard lines={3} />
            </View>
          )}

          {showError && (
            <View className="flex-1">
              <ErrorState
                message={error ?? "An unexpected error occurred."}
                label={errorLabel}
                onRetry={onRetry}
              />
            </View>
          )}

          {showEmpty && (
            <View className="flex-1">
              <EmptyState
                icon={emptyIcon}
                title={emptyTitle ?? "No data"}
                subtitle={emptySubtitle}
                action={emptyAction}
              />
            </View>
          )}

          {showContent && (
            <>
              {header}
              {children}
            </>
          )}
        </View>
      </ErrorBoundary>
    </GradientBackground>
  );
}

export { ScreenLayout };
export default ScreenLayout;
