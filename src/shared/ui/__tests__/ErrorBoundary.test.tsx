import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ScreenErrorBoundary } from '../ErrorBoundary';

/** Helper component that throws when shouldThrow is true */
function ThrowBaby({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Test crash');
  return <Text>All good</Text>;
}

describe('ScreenErrorBoundary', () => {
  beforeAll(() => {
    // Suppress expected console.error from the caught error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no error', () => {
    render(
      <ScreenErrorBoundary>
        <Text>Content</Text>
      </ScreenErrorBoundary>
    );
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('shows fallback when child throws', () => {
    render(
      <ScreenErrorBoundary>
        <ThrowBaby shouldThrow />
      </ScreenErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('shows the screen name in fallback when provided', () => {
    render(
      <ScreenErrorBoundary screenName="TestScreen">
        <ThrowBaby shouldThrow />
      </ScreenErrorBoundary>
    );
    expect(screen.getByText(/TestScreen/)).toBeTruthy();
  });

  it('retry button resets and shows children again', () => {
    // Step 1: render with throwing child — fallback shows
    render(
      <ScreenErrorBoundary>
        <ThrowBaby shouldThrow />
      </ScreenErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Step 2: press retry — boundary resets, but child still throws
    // so fallback shows again (expected — child hasn't changed)
    fireEvent.press(screen.getByText('Retry'));
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Step 3: render with non-throwing children and press retry
    // (simulates fixing the error condition before retrying)
    const { rerender } = render(
      <ScreenErrorBoundary>
        <ThrowBaby shouldThrow />
      </ScreenErrorBoundary>
    );

    rerender(
      <ScreenErrorBoundary>
        <Text>Fixed content</Text>
      </ScreenErrorBoundary>
    );

    // Still shows fallback because boundary hasn't been reset
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Press retry — now children don't throw
    fireEvent.press(screen.getByText('Retry'));
    expect(screen.getByText('Fixed content')).toBeTruthy();
  });
});
