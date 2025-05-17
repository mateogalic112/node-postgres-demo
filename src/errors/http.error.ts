export abstract class HttpError extends Error {
  status: number;
  message: string;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

export class InternalServerError extends HttpError {
  constructor(message?: string) {
    super(500, message || "Internal Server Error");
  }
}
