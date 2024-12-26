import { AuthController } from "auth/auth.controller";
import App from "./app";
import UsersController from "users/users.controller";
import { ProductController } from "products/products.controller";

const app = new App([new AuthController(), new ProductController(), new UsersController()]);
app.listen();
