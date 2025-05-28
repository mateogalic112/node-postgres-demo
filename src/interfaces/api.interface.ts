export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: {
    id: number;
  } | null;
}
