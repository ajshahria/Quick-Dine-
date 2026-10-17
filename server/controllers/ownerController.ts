import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { Restaurant } from "../models/Restaurant.js";
import { v2 as cloudinary } from "cloudinary";
import { Booking } from "../models/Booking.js";
import { configuredSlots, objectId, positiveInteger, text, today } from "../lib/validation.js";
import { HttpError } from "../lib/errors.js";
import { changeBookingStatus, lockRestaurant, transaction } from "../services/reservations.js";

const uploadImage = (buffer: Buffer): Promise<string> => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream({ folder:"QuickDine" }, (error, result) => {
    if (error || !result) reject(new HttpError(502, "Image upload failed")); else resolve(result.secure_url);
  });
  stream.end(buffer);
});
function profile(body: Record<string, unknown>, partial = false) {
  const result: Record<string, unknown> = {};
  for (const field of ["name", "description", "cuisine", "priceRange", "location", "address", "chef"]) {
    if (!partial || body[field] !== undefined) result[field] = text(body[field], field, field === "description" ? 5000 : 200);
  }
  if (result.priceRange && !["$", "$$", "$$$", "$$$$"].includes(result.priceRange as string)) throw new HttpError(400, "Invalid price range");
  if (body.totalSeats !== undefined || !partial) {
    const raw = body.totalSeats === undefined ? 20 : body.totalSeats;
    const number = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
    result.totalSeats = positiveInteger(number, "Seat capacity");
  }
  if (body.availableSlots !== undefined || !partial) result.availableSlots = configuredSlots(body.availableSlots ?? ["17:00", "18:00", "19:00", "20:00", "21:00"]);
  if (body.tags !== undefined) {
    const tags = typeof body.tags === "string" ? body.tags.split(",").map(t => t.trim()).filter(Boolean) : body.tags;
    if (!Array.isArray(tags) || tags.length > 20) throw new HttpError(400, "Provide up to 20 tags");
    result.tags = tags.map(t => text(t, "Tag", 50));
  }
  return result;
}
export const getOwnerRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(await Restaurant.findOne({ owner:req.user!._id }));
};
export const createOwnerRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  if (await Restaurant.exists({ owner:req.user!._id })) throw new HttpError(409, "You already have a restaurant registered");
  const data = profile(req.body);
  const slug = (data.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  if (!slug) throw new HttpError(400, "Name must contain at least one English letter or number");
  const image = req.file ? await uploadImage(req.file.buffer) : "";
  res.status(201).json(await Restaurant.create({ ...data, slug, image, owner:req.user!._id, status:"pending" }));
};
export const updateOwnerRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  const found = await Restaurant.findOne({ owner:req.user!._id });
  if (!found) throw new HttpError(404, "Restaurant profile not found");
  const data = profile(req.body, true);
  if (req.file) data.image = await uploadImage(req.file.buffer);
  const updated = await transaction(async session => {
    const restaurant = await lockRestaurant(found._id.toString(), session);
    const active = await Booking.find({ restaurant:restaurant._id, status:"confirmed", date:{ $gte:new Date(`${today()}T00:00:00.000Z`) } }).session(session);
    const totals = new Map<string, number>();
    for (const booking of active) {
      const key = `${booking.date.toISOString()}|${booking.time}`;
      totals.set(key, (totals.get(key) || 0) + booking.guests);
      if (data.availableSlots && !(data.availableSlots as string[]).includes(booking.time)) throw new HttpError(409, "Cannot remove a slot with confirmed bookings");
    }
    if (data.totalSeats !== undefined && [...totals.values()].some(total => total > Number(data.totalSeats))) throw new HttpError(409, "Capacity cannot be lower than confirmed reservations");
    restaurant.set(data);
    await restaurant.save({ session });
    return restaurant;
  });
  res.json(updated);
};
export const getOwnerBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  const restaurant = await Restaurant.findOne({ owner:req.user!._id });
  if (!restaurant) throw new HttpError(404, "Restaurant profile not found");
  res.json(await Booking.find({ restaurant:restaurant._id }).populate("user", "name email phone").sort({ date:-1, time:-1 }));
};
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const status = req.body.status;
  if (!["confirmed", "cancelled", "completed"].includes(status)) throw new HttpError(400, "Invalid booking status");
  res.json(await changeBookingStatus(objectId(req.params.id), req.user!._id.toString(), status, true));
};
