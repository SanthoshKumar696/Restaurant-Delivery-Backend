import { NextFunction, Request, Response } from "express";
import {
  createCaptain as createCaptainService,
  getAvailableCaptains as getAvailableCaptainsService,
  getCaptainAvailability as getCaptainAvailabilityService,
  getCaptainById as getCaptainByIdService,
  getCaptains as getCaptainsService,
  getDeliveryStaff as getDeliveryStaffService,
  updateCaptain as updateCaptainService,
  updateCaptainAvailability as updateCaptainAvailabilityService,
} from "./captain.service";

export const getDeliveryStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await getDeliveryStaffService(req.admin!.tenantId);
    return res.status(200).json({ success: true, message: "Delivery staff fetched successfully", items: staff });
  } catch (error) { next(error); }
};

export const getCaptainAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCaptainAvailabilityService(req.staff!.tenantId, req.staff!.staffId);
    return res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateCaptainAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await updateCaptainAvailabilityService(req.staff!.tenantId, req.staff!.staffId, req.body.status);
    return res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const createCaptain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const captain = await createCaptainService(req.admin!.tenantId, req.body);
    return res.status(201).json({ success: true, message: "Captain created successfully", data: captain });
  } catch (error) {
    next(error);
  }
};

export const getCaptains = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const captains = await getCaptainsService(_req.admin!.tenantId);
    return res.status(200).json({ success: true, message: "Captains fetched successfully", items: captains });
  } catch (error) {
    next(error);
  }
};

export const getAvailableCaptains = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const captains = await getAvailableCaptainsService(_req.admin!.tenantId);
    return res.status(200).json({ success: true, message: "Available captains fetched successfully", items: captains });
  } catch (error) {
    next(error);
  }
};

export const getCaptainById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const captain = await getCaptainByIdService(Number(req.params.id), req.admin!.tenantId);
    return res.status(200).json({ success: true, message: "Captain fetched successfully", data: captain });
  } catch (error) {
    next(error);
  }
};

export const updateCaptain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const captain = await updateCaptainService(Number(req.params.id), req.admin!.tenantId, req.body);
    return res.status(200).json({ success: true, message: "Captain updated successfully", data: captain });
  } catch (error) {
    next(error);
  }
};

export const getMyCaptain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const captain = await getCaptainByIdService(req.staff!.staffId, req.staff!.tenantId);
    return res.status(200).json({ success: true, message: "Captain profile fetched successfully", data: captain });
  } catch (error) { next(error); }
};