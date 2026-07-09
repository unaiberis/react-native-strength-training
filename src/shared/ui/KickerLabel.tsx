import { Text, type TextProps } from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────

interface KickerLabelProps extends TextProps {
  children: string;
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

function KickerLabel({ children, className, ...props }: KickerLabelProps) {
  return (
    <Text
      className={`uppercase text-xs tracking-[1.8] font-extrabold text-titanium ${className ?? ""}`}
      {...props}
    >
      {children}
    </Text>
  );
}

export { KickerLabel };
export default KickerLabel;
