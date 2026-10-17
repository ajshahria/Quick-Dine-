import type { Request, Response, CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { AuthSession } from "../models/AuthSession.js";
import { User } from "../models/User.js";

export const SESSION_COOKIE = "qd_session";
export const CSRF_COOKIE = "qd_csrf";
export const SESSION_SECONDS = 60 * 60;
export function cookieOptions(): CookieOptions {
  return { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/" };
}
export function secret(): string {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return process.env.JWT_SECRET;
}
export async function issueSession(res: Response, userId: string) {
  const id = randomUUID();
  await AuthSession.create({ _id:id, user:userId, expiresAt:new Date(Date.now() + SESSION_SECONDS * 1000) });
  const token = jwt.sign({}, secret(), { subject:userId, jwtid:id, expiresIn:SESSION_SECONDS, algorithm:"HS256", issuer:"quickdine", audience:"quickdine-web" });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge:SESSION_SECONDS * 1000 });
}
export async function sessionUser(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string") return null;
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, secret(), { algorithms:["HS256"], issuer:"quickdine", audience:"quickdine-web" });
    if (typeof decoded === "string" || !decoded.sub || !decoded.jti) return null;
    payload = decoded;
  } catch { return null; }
  const session = await AuthSession.findOne({ _id:payload.jti, user:payload.sub, expiresAt:{ $gt:new Date() } });
  if (!session) return null;
  return User.findById(session.user).select("-password");
}
export async function revokeSession(req: Request, res: Response) {
  try {
    const decoded = jwt.verify(req.cookies?.[SESSION_COOKIE] || "", secret(), { algorithms:["HS256"], issuer:"quickdine", audience:"quickdine-web" });
    if (typeof decoded !== "string" && decoded.jti) await AuthSession.deleteOne({ _id:decoded.jti });
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) throw error;
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
