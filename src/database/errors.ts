import { DatabaseError } from "pg";

export class PgError extends DatabaseError {
  constructor(error: DatabaseError) {
    super(error.message, error.length, error.name);
  }

  static isPgError(error: unknown): boolean {
    return !!error && typeof error === "object" && "code" in error;
  }

  static isSerializationFailure(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "40001";
  }

  static isDeadlockDetected(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "40P01";
  }

  static isUniqueViolation(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "23505";
  }

  static isViolatingForeignKeyConstraint(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "23503";
  }

  static isNotNullViolation(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "23502";
  }

  static isCheckViolation(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "23514";
  }

  static isConnectionError(error: unknown): boolean {
    return (
      this.isPgError(error) &&
      ["08000", "08003", "08006"].includes((error as { code: string }).code)
    );
  }

  static isLockTimeout(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "55P03";
  }
}
