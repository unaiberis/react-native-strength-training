import { z } from "zod";

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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

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
