import App from "./app";
import UsersController from "users/users.controller";

const app = new App([new UsersController()]);
app.listen();
