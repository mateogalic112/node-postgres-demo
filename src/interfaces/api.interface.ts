export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: {
    id: number;
  } | null;
}

// Extend the Express session interface to include user ID
declare module "express" {
  interface Request {
    userId?: number;
  }
}
