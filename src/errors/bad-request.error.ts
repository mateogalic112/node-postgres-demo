import { HttpError } from "./http.error";

export class BadRequestError extends HttpError {
  message: string;
  constructor(message: string) {
    super(400, message);
    this.message = message;
  }
}
