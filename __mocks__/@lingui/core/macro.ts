// ─── t identity mock ────────────────────────────────────────────────────────
// Same implementation as in @lingui/react/macro for consistency.

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

export function plural(
  _value: number | string,
  options: { one?: string; other: string; [key: string]: string | undefined },
): string {
  return options.one ?? options.other;
}

export function msg(
  literals: TemplateStringsArray,
  ...placeholders: any[]
): { message: string } {
  let message = "";
  for (let i = 0; i < literals.length; i++) {
    message += literals[i];
    if (i < placeholders.length) {
      message += String(placeholders[i] ?? "");
    }
  }
  return { message };
}

export function defineMessage(
  literals: TemplateStringsArray | { message?: string; id?: string },
  ...placeholders: any[]
): { message: string } {
  if (typeof literals === "object" && !Array.isArray(literals)) {
    return { message: literals.message ?? literals.id ?? "" };
  }
  let message = "";
  if (Array.isArray(literals)) {
    for (let i = 0; i < literals.length; i++) {
      message += literals[i];
      if (i < placeholders.length) {
        message += String(placeholders[i] ?? "");
      }
    }
  }
  return { message };
}
