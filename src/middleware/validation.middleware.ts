import { BadRequestError } from "errors/http.error";
import type { RequestHandler } from "express";
import { ZodError, z } from "zod";

type RequestSchema = z.ZodSchema<{
  body?: unknown;
  query?: unknown;
  params?: unknown;
}>;

type InferRequest<T extends RequestSchema> = {
  params: z.infer<T>["params"] extends undefined ? object : z.infer<T>["params"];
  body: z.infer<T>["body"] extends undefined ? unknown : z.infer<T>["body"];
  query: z.infer<T>["query"] extends undefined ? object : z.infer<T>["query"];
};

const validationMiddleware =
  <T extends RequestSchema>(
    schema: T
  ): RequestHandler<
    InferRequest<T>["params"],
    unknown,
    InferRequest<T>["body"],
    InferRequest<T>["query"]
  > =>
  async (req, _, next) => {
    try {
      schema.parse(req);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new BadRequestError(error.issues[0].message));
      }
      return next(new BadRequestError("Error in validation process."));
    }
  };

export default validationMiddleware;
