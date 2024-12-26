import { RegisterPayload } from "auth/auth.validation";
import { DBModel } from "interfaces/db.interface";

export interface User extends DBModel, RegisterPayload {}
