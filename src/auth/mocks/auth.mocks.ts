import { LoginPayload, RegisterPayload } from "auth/auth.validation";

export const createMockedRegisterPayload = (
  username: string,
  password: string
): RegisterPayload => ({
  username,
  email: `${username}@example.com`,
  password
});

export const createMockedLoginPayload = (username: string, password: string): LoginPayload => ({
  email: `${username}@example.com`,
  password
});
