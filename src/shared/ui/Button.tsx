import { memo, type ComponentProps } from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ComponentProps<typeof TouchableOpacity> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantStyles: Record<
  ButtonVariant,
  { container: string; text: string }
> = {
  primary: {
    container: 'bg-brand-500 active:bg-brand-600',
    text: 'text-surface-950 font-semibold',
  },
  secondary: {
    container: 'bg-surface-800 active:bg-surface-700 border border-surface-700',
    text: 'text-surface-100 font-semibold',
  },
  ghost: {
    container: 'bg-transparent active:bg-surface-800',
    text: 'text-brand-500 font-medium',
  },
  danger: {
    container: 'bg-red-600 active:bg-red-700',
    text: 'text-white font-semibold',
  },
};

export const Button = memo(function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  style,
  ...props
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={title}
      className={`
        rounded-xl py-3.5 px-6 items-center justify-center flex-row
        ${styles.container}
        ${isDisabled ? 'opacity-50' : ''}
        ${className ?? ''}
      `}
      style={style}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          testID="loading-indicator"
          className="mr-2"
          color={variant === 'primary' ? '#09090b' : '#fafafa'}
          size="small"
        />
      )}
      <Text className={`text-base ${styles.text}`}>{title}</Text>
    </TouchableOpacity>
  );
});
