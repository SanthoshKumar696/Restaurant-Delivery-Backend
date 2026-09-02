import { Request, Response } from "express";
import { prisma } from "../database/prisma";
import { successResponse, errorResponse } from "../utils/response";

export const healthCheck = async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return successResponse(
      res,
      "Restaurant backend is healthy",
      {
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch {
    return errorResponse(
      res,
      "Restaurant backend is running but database is unavailable",
      503,
      "DATABASE_UNAVAILABLE"
    );
  }
};