import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { createRequire } from "node:module";
import cors from "cors";
import cookieParser from "cookie-parser";
import type { HelmetOptions } from "helmet";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import restaurantRouter from "./routes/restaurantRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import { allowedOrigins, csrfProtection } from "./middlewares/csrf.js";
import { secret } from "./lib/session.js";
import { HttpError } from "./lib/errors.js";

// Vercel's NodeNext checker resolves Helmet's CommonJS types for this ESM app.
// Load that callable export explicitly while retaining its middleware types.
const helmet: (options?: Readonly<HelmetOptions>) => RequestHandler = createRequire(import.meta.url)("helmet");

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin:(origin, callback) => callback(null, !origin || allowedOrigins().includes(origin)), credentials:true }));
  app.use(express.json({ limit:"32kb" }));
  app.use(cookieParser(secret()));
  app.get("/", (_req, res) => { res.json({ status:"live", service:"QuickDine API" }); });
  app.get("/health/live", (_req, res) => { res.json({ status:"live" }); });
  app.get("/health/ready", async (_req, res) => {
    try { await connectDB(); await mongoose.connection.db!.admin().ping(); res.json({ status:"ready" }); }
    catch { res.status(503).json({ status:"unavailable" }); }
  });
  app.use("/api", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.use("/api", csrfProtection);
  app.use("/api", async (_req, _res, next) => { await connectDB(); next(); });
  app.use("/api/auth", authRouter);
  app.use("/api/restaurants", restaurantRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api/owner", ownerRouter);
  app.use("/api/admin", adminRouter);
  app.use((_req, res) => { res.status(404).json({ message:"Endpoint not found" }); });
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error instanceof HttpError ? error.status : error.code === 11000 ? 409 : error.name === "ValidationError" || error.name === "CastError" || error.type === "entity.parse.failed" ? 400 : 500;
    res.status(status).json({ message:status === 500 ? "Server error; please try again" : error.code === 11000 ? "A record with these details already exists" : error.message });
  };
  app.use(errorHandler);
  return app;
}
