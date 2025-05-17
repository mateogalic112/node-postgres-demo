export abstract class HttpError extends Error {
  status: number;
  message: string;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

export class BadRequestError extends HttpError {
  constructor(message?: string) {
    super(400, message || "Bad Request");
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message?: string) {
    super(401, message || "Unauthorized");
  }
}

export class ForbiddenError extends HttpError {
  constructor(message?: string) {
    super(403, message || "Forbidden");
  }
}

export class NotFoundError extends HttpError {
  constructor(message?: string) {
    super(404, message || "Not Found");
  }
}

export class InternalServerError extends HttpError {
  constructor(message?: string) {
    super(500, message || "Internal Server Error");
  }
}
