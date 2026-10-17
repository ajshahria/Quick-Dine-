import mongoose, { type ClientSession } from "mongoose";
import { Restaurant } from "../models/Restaurant.js";
import { Booking } from "../models/Booking.js";
import { HttpError } from "../lib/errors.js";
// Every capacity-affecting write takes the same document lock. A real write
// forces concurrent transactions to retry against a fresh committed snapshot.
export async function lockRestaurant(id: string, session: ClientSession) {
  const restaurant = await Restaurant.findOneAndUpdate({ _id: id }, { $inc: { bookingRevision: 1 } }, { returnDocument:"after", session });
  if (!restaurant) throw new HttpError(404, "Restaurant not found");
  return restaurant;
}
export async function transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  return mongoose.connection.transaction(work);
}
export async function changeBookingStatus(id: string, actor: string, status: "cancelled" | "completed" | "confirmed", owner = false) {
  return transaction(async session => {
    const initial = await Booking.findById(id).session(session);
    if (!initial) throw new HttpError(404, "Booking not found");
    const restaurant = await lockRestaurant(initial.restaurant.toString(), session);
    if (owner ? restaurant.owner.toString() !== actor : initial.user.toString() !== actor) throw new HttpError(403, "Not authorized to manage this booking");
    if (initial.status === status) return initial;
    if (initial.status !== "confirmed" || status === "confirmed") throw new HttpError(409, "Only confirmed bookings can be cancelled or completed; create a new reservation instead");
    initial.status = status;
    await initial.save({ session });
    return initial;
  });
}
