import { NextFunction, Request, Response } from "express";
import { z } from "zod";

export const validate = (
  schema: z.ZodType<{
    body?: unknown;
    params?: unknown;
    query?: unknown;
  }>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
          details: errors,
        },
      });
    }

    const data = result.data;

    if (data.body !== undefined) {
      Object.defineProperty(req, "body", {
        value: data.body,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }

    if (data.params !== undefined) {
      Object.defineProperty(req, "params", {
        value: data.params as Request["params"],
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }

    if (data.query !== undefined) {
      Object.defineProperty(req, "query", {
        value: data.query as Request["query"],
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }

    next();
  };
};