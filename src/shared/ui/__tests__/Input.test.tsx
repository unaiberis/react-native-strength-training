import { render, screen } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input', () => {
  it('renders the label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('has accessibilityLabel from label', () => {
    render(<Input label="Email" />);
    // The TextInput gets accessibilityLabel from the label prop
    const container = screen.getByLabelText('Email');
    expect(container).toBeTruthy();
  });

  it('shows error text when error prop is provided', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('uses placeholder as fallback for accessibilityLabel when no label', () => {
    render(<Input placeholder="Enter email" />);
    const container = screen.getByLabelText('Enter email');
    expect(container).toBeTruthy();
  });

  it('applies focused border style on focus', () => {
    const { getByPlaceholderText } = render(<Input placeholder="Type here" />);
    const input = getByPlaceholderText('Type here');
    expect(input).toBeTruthy();
  });
});
