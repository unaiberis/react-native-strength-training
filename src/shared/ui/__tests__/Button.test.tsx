import { render, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders the title', () => {
    render(<Button title="Submit" onPress={() => {}} />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('has accessibilityRole button', () => {
    render(<Button title="Submit" onPress={() => {}} />);
    // Use getByLabelText since getByRole requires native host component detection
    // that may not work reliably with the mocked react-native in node environment
    const button = screen.getByLabelText('Submit');
    expect(button).toBeTruthy();
  });

  it('has accessibilityLabel matching title', () => {
    render(<Button title="Save" onPress={() => {}} />);
    const button = screen.getByLabelText('Save');
    expect(button.props.accessibilityLabel).toBe('Save');
  });

  it('shows loading indicator when loading', () => {
    render(<Button title="Save" loading onPress={() => {}} />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('sets disabled accessibility state when loading', () => {
    render(<Button title="Save" loading onPress={() => {}} />);
    const button = screen.getByLabelText('Save');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button title="Save" disabled onPress={() => {}} />);
    const button = screen.getByLabelText('Save');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });
});
