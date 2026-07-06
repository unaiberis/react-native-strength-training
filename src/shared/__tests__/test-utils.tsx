import { type ReactNode } from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";

/**
 * Reusable test wrapper that provides I18nProvider context.
 *
 * Usage:
 *   render(<Component />, { wrapper: TestWrapper });
 *
 * The i18n instance comes from the global vitest.setup.ts mock,
 * which provides identity `t()` and locale "en".
 */
export function TestWrapper({ children }: { children: ReactNode }) {
  return <I18nProvider i18n={i18n as any}>{children}</I18nProvider>;
}
