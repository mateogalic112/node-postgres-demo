import { z } from "zod";

export const MINIMUM_USERNAME_CHARACTERS = 3;
export const MINIMUM_PASSWORD_CHARACTERS = 6;

export const registerSchema = z.object({
  username: z
    .string()
    .min(
      MINIMUM_USERNAME_CHARACTERS,
      `Username has to have at least ${MINIMUM_USERNAME_CHARACTERS} characers`
    ),
  email: z.email("Invalid email format provided"),
  password: z
    .string()
    .min(
      MINIMUM_PASSWORD_CHARACTERS,
      `Password needs to have at least ${MINIMUM_PASSWORD_CHARACTERS} chars`
    )
});

export type RegisterPayload = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string()
});

export type LoginPayload = z.infer<typeof loginSchema>;
