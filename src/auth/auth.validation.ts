import { z } from "zod";

const MINIMUM_USERNAME_CHARS = 3;
const MINIMUM_PASSWORD_CHARS = 6;

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(
        MINIMUM_USERNAME_CHARS,
        `Username has to have at least ${MINIMUM_USERNAME_CHARS} characers`
      ),
    email: z.string().email("Invalid email format provided"),
    password: z
      .string()
      .min(
        MINIMUM_PASSWORD_CHARS,
        `Password needs to have at least ${MINIMUM_PASSWORD_CHARS} chars`
      )
  })
});

export type RegisterPayload = z.infer<typeof registerSchema>["body"];

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string()
  })
});

export type LoginPayload = z.infer<typeof loginSchema>["body"];
