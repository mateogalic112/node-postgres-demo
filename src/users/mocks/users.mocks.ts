import { registerUserRequest } from "__tests__/setup";
import App from "app";

export const bulkInsertUsers = async (app: App, count: number) => {
  for (let i = 0; i < count; i++) {
    await registerUserRequest(app, `mocked-user-${i}`);
  }
};
