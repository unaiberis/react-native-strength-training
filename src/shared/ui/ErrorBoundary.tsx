import { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
  screenName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ScreenErrorBoundary] ${this.props.screenName ?? 'Screen'} crashed:`,
      error,
      info.componentStack
    );
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-surface-950 items-center justify-center px-8">
          <Text className="text-red-400 text-lg font-semibold mb-2">
            Something went wrong
          </Text>
          <Text className="text-surface-400 text-sm text-center mb-6">
            {this.props.screenName
              ? `"${this.props.screenName}" encountered an error.`
              : 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            className="bg-brand-500 rounded-xl py-3 px-8"
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text className="text-surface-950 font-semibold text-base">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
