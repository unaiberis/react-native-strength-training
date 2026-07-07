import { Component, type ReactNode, type ErrorInfo } from "react";
import { View, Text, TouchableOpacity } from "react-native";

// ─── Props / State ─────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback that receives the error and a reset function */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
  /** Optional error handler for logging / reporting */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// ─── Default Fallback ──────────────────────────────────────────────────────

function DefaultFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6 bg-background">
      <View className="w-16 h-16 rounded-full bg-danger/20 items-center justify-center mb-4">
        <Text className="text-danger text-3xl">!</Text>
      </View>
      <Text className="text-surface-50 text-lg font-bold mb-2 text-center">
        Something went wrong
      </Text>
      <Text className="text-surface-400 text-sm text-center mb-4 leading-5">
        {error.message || "An unexpected error occurred."}
      </Text>
      <TouchableOpacity
        onPress={onReset}
        className="bg-card border border-border rounded-xl px-6 py-3 active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text className="text-surface-50 font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Error Boundary ────────────────────────────────────────────────────────

/**
 * React Error Boundary that catches rendering errors in its children tree
 * and shows a fallback UI instead of crashing the whole screen.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyScreen />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary
 *   fallback={({ error, reset }) => <MyFallback error={error} onRetry={reset} />}
 *   onError={(error, info) => reportCrash(error, info)}
 * >
 *   <MyScreen />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset,
        });
      }
      return (
        <DefaultFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
