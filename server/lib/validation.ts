import { isObjectIdOrHexString } from "mongoose";
import { HttpError } from "./errors.js";
export const TIME_ZONE = "Asia/Dhaka";
export const BOOKING_HORIZON_DAYS = 90;
export function text(value: unknown, label: string, max = 100): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new HttpError(400, `${label} is required and must be at most ${max} characters`);
  return value.trim();
}
export function objectId(value: unknown): string {
  if (typeof value !== "string" || !isObjectIdOrHexString(value)) throw new HttpError(400, "Invalid identifier");
  return value;
}
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function bookingDate(value: unknown, now = new Date()): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, "Date must use YYYY-MM-DD");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new HttpError(400, "Invalid calendar date");
  const start = new Date(`${today(now)}T00:00:00.000Z`).getTime();
  if (date.getTime() < start || date.getTime() > start + BOOKING_HORIZON_DAYS * 86400000) throw new HttpError(400, "Book between today and 90 days ahead (Asia/Dhaka)");
  return date;
}
export function isFutureSlot(date: Date, time: string, now = new Date()): boolean {
  return new Date(`${date.toISOString().slice(0, 10)}T${time}:00+06:00`).getTime() > now.getTime();
}
export function slot(value: unknown, slots: string[], date: Date): string {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value) || !slots.includes(value)) throw new HttpError(400, "Choose a configured dining time slot");
  if (!isFutureSlot(date, value)) throw new HttpError(400, "This dining time has already passed (Asia/Dhaka)");
  return value;
}
export function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 10000) throw new HttpError(400, `${label} must be an integer between 1 and 10000`);
  return value;
}
export function contactDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Booking contact details are required");
  const input = value as Record<string, unknown>;
  const name = text(input.name, "Contact name");
  const email = text(input.email, "Contact email", 254).toLowerCase();
  const phone = text(input.phone, "Contact phone", 30).replace(/[\s()-]/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid contact email");
  if (!/^\+?\d{7,15}$/.test(phone)) throw new HttpError(400, "Enter a valid contact phone (7-15 digits)");
  return { name, email, phone };
}
export function configuredSlots(value: unknown): string[] {
  const items = typeof value === "string" ? value.split(",").map(s => s.trim()) : value;
  if (!Array.isArray(items) || items.length < 1 || items.length > 48 || items.some(s => typeof s !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s))) throw new HttpError(400, "Provide valid HH:mm dining slots");
  return [...new Set(items as string[])];
}
