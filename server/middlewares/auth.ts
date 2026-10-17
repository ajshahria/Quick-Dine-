import { NextFunction, Request, Response } from "express";
import { IUser } from "../models/User.js";
import { sessionUser } from "../lib/session.js";
export interface AuthRequest extends Request { user?: IUser }
export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const user = await sessionUser(req);
  if (!user) { res.status(401).json({ message:"Not authorized; please sign in" }); return; }
  req.user = user;
  next();
};
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === "admin") next();
  else res.status(403).json({ message:"Access denied, admin role required" });
};
export const ownerOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && ["owner", "admin"].includes(req.user.role)) next();
  else res.status(403).json({ message:"Access denied, owner role required" });
};
