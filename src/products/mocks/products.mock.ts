import App from "app";
import { createProductRequest, getAuthCookieAfterRegister } from "__tests__/setup";

export const bulkInsertProducts = async (app: App, count: number) => {
  const authCookie = await getAuthCookieAfterRegister(app, "testuser");
  for (let i = 0; i < count; i++) {
    await createProductRequest(app, authCookie);
  }
};
