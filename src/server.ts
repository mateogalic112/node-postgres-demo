import { AuthController } from "auth/auth.controller";
import App from "./app";
import UsersController from "users/users.controller";

const app = new App([new AuthController(), new UsersController()]);
app.listen();
