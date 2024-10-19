import { RegisterPayload } from "auth/auth.validation";

export interface User extends RegisterPayload {
  id: number;
  created_at: Date;
}
