import React from "react";

// ─── type exports ──────────────────────────────────────────────────────────
// We don't export the full type set — consumers only need the runtime values.

/**
 * Identity mock for the `t` macro.
 *
 * Handles both template literal form and object form so existing code
 * works unchanged in test environment.
 */
export function t(
  literals: TemplateStringsArray | { message?: string; id?: string },
  ...placeholders: any[]
): string {
  // Object form: `t({ id: "msg.hello", message: "Hello {name}" })`
  if (typeof literals === "object" && !Array.isArray(literals)) {
    const desc = literals as { message?: string; id?: string };
    return desc.message ?? desc.id ?? "";
  }

  // Template literal form: t`Hello {name}`
  if (Array.isArray(literals)) {
    let result = "";
    for (let i = 0; i < literals.length; i++) {
      result += literals[i];
      if (i < placeholders.length) {
        const val = placeholders[i];
        // LabeledExpression: { name: "John" } → extract the value
        if (val && typeof val === "object" && !Array.isArray(val)) {
          result += String(Object.values(val as Record<string, unknown>)[0] ?? "");
        } else {
          result += String(val ?? "");
        }
      }
    }
    return result;
  }

  return String(literals ?? "");
}

/**
 * Identity mock for the `Trans` component.
 *
 * Renders children as-is (just like a Fragment). Works because our
 * test strings are the source strings and don't need translation.
 */
export function Trans({
  children,
  message,
  id,
}: {
  children?: React.ReactNode;
  message?: string;
  id?: string;
}): React.ReactNode {
  return (children ?? message ?? id) as React.ReactNode;
}

export function useLingui() {
  return {
    i18n: {
      locale: "es",
      _: (msg: { message?: string; id?: string; values?: Record<string, unknown> }) =>
        msg.message ?? msg.id ?? "",
    },
    t,
  };
}
