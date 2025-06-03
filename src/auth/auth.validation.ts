import { z } from "zod";
import { MINIMUM_PASSWORD_CHARACTERS, MINIMUM_USERNAME_CHARACTERS } from "./auth.constants";

export const registerSchema = z.object({
  username: z
    .string()
    .min(
      MINIMUM_USERNAME_CHARACTERS,
      `Username has to have at least ${MINIMUM_USERNAME_CHARACTERS} characers`
    ),
  email: z.string().email("Invalid email format provided"),
  password: z
    .string()
    .min(
      MINIMUM_PASSWORD_CHARACTERS,
      `Password needs to have at least ${MINIMUM_PASSWORD_CHARACTERS} chars`
    )
});

export type RegisterPayload = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginPayload = z.infer<typeof loginSchema>;
