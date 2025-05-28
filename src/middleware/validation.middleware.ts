import { BadRequestError } from "errors/http.error";
import type { RequestHandler } from "express";
import { ZodError, z } from "zod";

const validationMiddleware =
  <T extends z.ZodType<{ body?: unknown; query?: unknown; params?: unknown }>>(
    schema: T
  ): RequestHandler<
    z.infer<T>["params"] extends undefined ? object : z.infer<T>["params"],
    unknown,
    z.infer<T>["body"] extends undefined ? unknown : z.infer<T>["body"],
    z.infer<T>["query"] extends undefined ? object : z.infer<T>["query"]
  > =>
  async (req, _, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new BadRequestError(error.issues[0].message));
      }
      return next(new BadRequestError("Error in validation process."));
    }
  };

export default validationMiddleware;
