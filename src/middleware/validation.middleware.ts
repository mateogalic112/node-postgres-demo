import { BadRequestError } from "errors/http.error";
import type { RequestHandler } from "express";
import { AnyZodObject, ZodError } from "zod";

const validationMiddleware =
  (schema: AnyZodObject): RequestHandler =>
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
