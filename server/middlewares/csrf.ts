import type { RequestHandler } from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookieOptions, CSRF_COOKIE } from "../lib/session.js";
export function allowedOrigins() {
  return (process.env.FRONTEND_ORIGINS || "http://localhost:5173").split(",").map(s => s.trim()).filter(Boolean);
}
export const csrfToken: RequestHandler = (req, res) => {
  const existing = req.signedCookies?.[CSRF_COOKIE];
  const token = typeof existing === "string" ? existing : randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, { ...cookieOptions(), signed:true, maxAge:3600000 });
  res.json({ csrfToken:token });
};
export const csrfProtection: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && !allowedOrigins().includes(origin)) { res.status(403).json({ message:"Untrusted request origin" }); return; }
  const cookie = req.signedCookies?.[CSRF_COOKIE];
  const header = req.get("x-csrf-token");
  if (typeof cookie !== "string" || !header || Buffer.byteLength(cookie) !== Buffer.byteLength(header) || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    res.status(403).json({ message:"Invalid CSRF token; reload and try again" }); return;
  }
  next();
};
