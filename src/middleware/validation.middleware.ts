import { BadRequestError } from "errors/bad-request.error";
import type { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

const validationMiddleware =
  (schema: AnyZodObject) => async (req: Request, _: Response, next: NextFunction) => {
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
