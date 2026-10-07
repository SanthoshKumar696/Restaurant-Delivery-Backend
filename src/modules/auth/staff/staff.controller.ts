import { NextFunction, Request, Response } from "express";
import { loginStaff as loginStaffService } from "./staff.service";

export const loginStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loginStaffService(req.body);
    return res.status(200).json({ success: true, message: "Staff login successful", data: result });
  } catch (error) {
    next(error);
  }
};