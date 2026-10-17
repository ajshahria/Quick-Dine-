import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { Booking } from "../models/Booking.js";
import { HttpError } from "../lib/errors.js";
import { objectId } from "../lib/validation.js";
import { lockRestaurant, transaction } from "../services/reservations.js";
export const getAllRestaurants = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(await Restaurant.find({}).populate("owner", "name email phone").sort({ createdAt:-1 }));
};
export const approveRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  const status = req.body.status;
  if (!["approved", "rejected", "pending"].includes(status)) throw new HttpError(400, "Please provide a valid approval status");
  const id = objectId(req.params.id);
  res.json(await transaction(async session => {
    const restaurant = await lockRestaurant(id, session);
    restaurant.status = status;
    await restaurant.save({ session });
    return restaurant;
  }));
};
export const getAdminStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [totalUsers, totalOwners, totalBookings, totalRestaurants, latestBookings] = await Promise.all([
    User.countDocuments({role:"user"}), User.countDocuments({role:"owner"}), Booking.countDocuments({}), Restaurant.countDocuments({}),
    Booking.find({}).populate("user", "name email").populate("restaurant", "name").sort({createdAt:-1}).limit(10),
  ]);
  res.json({ users:{totalUsers, totalOwners, total:totalUsers + totalOwners}, restaurants:{total:totalRestaurants}, bookings:{total:totalBookings}, latestBookings });
};
