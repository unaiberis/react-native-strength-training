import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <Text>Card content</Text>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeTruthy();
  });

  it('renders title', () => {
    render(
      <Card title="My Card">
        <Text>Content</Text>
      </Card>
    );
    expect(screen.getByText('My Card')).toBeTruthy();
  });

  it('has no accessibilityRole when no onPress', () => {
    render(
      <Card>
        <Text>Content</Text>
      </Card>
    );
    // When no onPress, Card renders a View which has no accessibilityRole
    const text = screen.getByText('Content');
    expect(text).toBeTruthy();
    // No element with role "button" should exist
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('has accessibilityRole button when onPress provided', () => {
    render(
      <Card onPress={() => {}}>
        <Text>Content</Text>
      </Card>
    );
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });
});
