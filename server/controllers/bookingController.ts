import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { Booking, BOOKING_OCCASIONS } from "../models/Booking.js";
import { bookingDate, contactDetails, objectId, positiveInteger, slot } from "../lib/validation.js";
import { HttpError } from "../lib/errors.js";
import { changeBookingStatus, lockRestaurant, transaction } from "../services/reservations.js";

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  const restaurantId = objectId(req.body.restaurantId);
  const date = bookingDate(req.body.date);
  const guests = positiveInteger(req.body.guests, "Guest count");
  const contact = contactDetails(req.body.contact);
  const { occasion, specialRequests } = req.body;
  if (occasion !== undefined && occasion !== "" && !BOOKING_OCCASIONS.includes(occasion)) throw new HttpError(400, "Please provide a valid occasion");
  if (specialRequests !== undefined && (typeof specialRequests !== "string" || specialRequests.length > 1000)) throw new HttpError(400, "Special requests must be at most 1000 characters");
  const booking = await transaction(async session => {
    const restaurant = await lockRestaurant(restaurantId, session);
    if (restaurant.status !== "approved") throw new HttpError(409, "Reservations are not open for this restaurant yet");
    const time = slot(req.body.time, restaurant.availableSlots, date);
    const capacity = positiveInteger(restaurant.totalSeats, "Restaurant capacity");
    const existing = await Booking.find({ restaurant:restaurantId, date, time, status:"confirmed" }).session(session);
    const available = capacity - existing.reduce((sum, b) => sum + b.guests, 0);
    if (guests > available) throw new HttpError(409, `Only ${Math.max(0, available)} seats are available for this time slot`);
    const [created] = await Booking.create([{
      user:req.user!._id, restaurant:restaurantId, date, time, guests, contact,
      occasion:occasion || undefined, specialRequests:specialRequests?.trim() || undefined, status:"confirmed",
    }], { session });
    return created;
  });
  res.status(201).json(await booking.populate("restaurant", "name location image address"));
};
export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(await Booking.find({ user:req.user!._id }).populate("restaurant", "name location image address slug").sort({ date:-1, time:-1 }));
};
export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  const booking = await changeBookingStatus(objectId(req.params.id), req.user!._id.toString(), "cancelled");
  res.json(await booking.populate("restaurant", "name location image address"));
};
