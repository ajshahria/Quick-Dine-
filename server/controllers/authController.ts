import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { AuthRequest } from "../middlewares/auth.js";
import { issueSession, revokeSession } from "../lib/session.js";
import { text } from "../lib/validation.js";
import { HttpError } from "../lib/errors.js";
function credentials(body: Record<string, unknown>) {
  const email = text(body.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email");
  if (typeof body.password !== "string" || body.password.length < 8 || Buffer.byteLength(body.password) > 72) throw new HttpError(400, "Password must be at least 8 characters and at most 72 bytes");
  return { email, password:body.password };
}
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = credentials(req.body);
  const name = text(req.body.name, "Name");
  const phone = req.body.phone === undefined ? undefined : text(req.body.phone, "Phone", 30);
  if (phone && !/^\+?\d{11,15}$/.test(phone)) throw new HttpError(400, "Enter a phone number with 11-15 digits");
  if (await User.exists({ email })) throw new HttpError(409, "Unable to register with these details");
  const user = await User.create({ name, email, phone, password:await bcrypt.hash(password, 10), role:req.body.role === "owner" ? "owner" : "user" });
  await revokeSession(req, res);
  await issueSession(res, user._id.toString());
  res.status(201).json(user);
};
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  // Accept legacy shorter passwords on login while enforcing stronger new ones.
  const email = text(req.body.email, "Email", 254).toLowerCase();
  const password = req.body.password;
  if (typeof password !== "string" || !password || Buffer.byteLength(password) > 72) throw new HttpError(401, "Invalid email or password");
  const user = await User.findOne({ email });
  const fallback = "$2b$10$C6UzMDM.H6dfI/f/IKcEe.5vS9SE6HG89vQjV1iNF0fT1JrGWHf6u";
  const matches = await bcrypt.compare(password, user?.password || fallback);
  if (!user || !matches) throw new HttpError(401, "Invalid email or password");
  await revokeSession(req, res);
  await issueSession(res, user._id.toString());
  res.json(user);
};
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => { res.json(req.user); };
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  await revokeSession(req, res);
  res.status(204).end();
};
