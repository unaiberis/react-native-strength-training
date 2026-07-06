import { z } from "zod";
import { i18n } from "../../i18n";

// ─── Factory functions (i18n-aware) ────────────────────────────────────────

export function getLoginSchema() {
  return z.object({
    email: z
      .string()
      .min(1, i18n.t("Email is required"))
      .email(i18n.t("Invalid email address")),
    password: z
      .string()
      .min(1, i18n.t("Password is required")),
  });
}

export function getRegisterSchema() {
  return z.object({
    email: z
      .string()
      .min(1, i18n.t("Email is required"))
      .email(i18n.t("Invalid email address")),
    password: z
      .string()
      .min(8, i18n.t("Password must be at least 8 characters"))
      .regex(/[A-Z]/, i18n.t("Password must contain at least one uppercase letter")),
    displayName: z
      .string()
      .min(1, i18n.t("Display name is required"))
      .max(50, i18n.t("Display name must be 50 characters or less")),
  });
}

// ─── Legacy schemas (backward compatibility) ────────────────────────────────
// These use English string literals as validation messages.
// Existing code that imports loginSchema/registerSchema continues to work.

export const CoachRoleEnum = z.enum(["athlete", "coach"]);

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less"),
  role: CoachRoleEnum.optional().default("athlete"),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Defaults ───────────────────────────────────────────────────────────────

export const loginDefaults: LoginInput = {
  email: "",
  password: "",
};

export const registerDefaults: RegisterInput = {
  email: "",
  password: "",
  displayName: "",
  role: "athlete",
};
