import { Request, Response } from "express";
import { Restaurant } from "../models/Restaurant.js";
import { Booking } from "../models/Booking.js";
import { sessionUser } from "../lib/session.js";
import { bookingDate, isFutureSlot, objectId, positiveInteger, text } from "../lib/validation.js";
import { HttpError } from "../lib/errors.js";
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function values(value: unknown, label: string) {
  const items = Array.isArray(value) ? value : [value];
  if (items.length > 20) throw new HttpError(400, `Too many ${label} filters`);
  return items.map(v => text(v, label, 80));
}
export const getRestaurants = async (req: Request, res: Response): Promise<void> => {
  const { search, priceRange, rating, location, sort, cuisine } = req.query;
  const query: Record<string, unknown> = { status:"approved" };
  if (search !== undefined) {
    const pattern = escapeRegex(text(search, "Search", 100));
    query.$or = ["name", "tags", "location"].map(field => ({ [field]:{ $regex:pattern, $options:"i" } }));
  }
  if (cuisine !== undefined) query.cuisine = { $in:values(cuisine, "Cuisine").map(c => new RegExp(`^${escapeRegex(c)}$`, "i")) };
  if (priceRange !== undefined) {
    const prices = values(priceRange, "Price");
    if (prices.some(p => !["$", "$$", "$$$", "$$$$"].includes(p))) throw new HttpError(400, "Invalid price range");
    query.priceRange = { $in:prices };
  }
  if (rating !== undefined) {
    const value = Number(text(rating, "Rating", 5));
    if (!Number.isFinite(value) || value < 1 || value > 5) throw new HttpError(400, "Rating must be between 1 and 5");
    query.rating = { $gte:value };
  }
  if (location !== undefined) query.location = { $regex:escapeRegex(text(location, "Location", 100)), $options:"i" };
  if (sort !== undefined && !["rating", "price_low", "price_high", ""].includes(sort as string)) throw new HttpError(400, "Invalid sort option");
  const sorting: Record<string, 1 | -1> = sort === "rating" ? {rating:-1} : sort === "price_low" ? {priceRange:1} : sort === "price_high" ? {priceRange:-1} : {createdAt:-1};
  res.json(await Restaurant.find(query).sort(sorting));
};
export const getFeaturedRestaurants = async (_req: Request, res: Response): Promise<void> => {
  res.json(await Restaurant.find({ status:"approved", $or:[{featured:true}, {exclusive:true}] }).limit(6));
};
export const getRestaurantsBySlug = async (req: Request, res: Response): Promise<void> => {
  const restaurant = await Restaurant.findOne({ slug:req.params.slug });
  if (!restaurant) throw new HttpError(404, "Restaurant not found");
  if (restaurant.status !== "approved") {
    const user = await sessionUser(req);
    if (!user || (user.role !== "admin" && restaurant.owner.toString() !== user._id.toString())) throw new HttpError(404, "Restaurant not found");
  }
  res.json(restaurant);
};
export const getRestaurantAvailability = async (req: Request, res: Response): Promise<void> => {
  const id = objectId(req.params.id);
  const date = bookingDate(req.query.date);
  const restaurant = await Restaurant.findOne({ _id:id, status:"approved" });
  if (!restaurant) throw new HttpError(404, "Restaurant not found");
  const capacity = positiveInteger(restaurant.totalSeats, "Restaurant capacity");
  const bookings = await Booking.find({ restaurant:id, date, status:"confirmed" });
  res.json(restaurant.availableSlots.map(time => {
    const availableSeats = Math.max(0, capacity - bookings.filter(b => b.time === time).reduce((sum, b) => sum + b.guests, 0));
    return { time, availableSeats, isAvailable:availableSeats > 0 && isFutureSlot(date, time) };
  }));
};
