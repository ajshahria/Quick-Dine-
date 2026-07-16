/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Calendar, Users, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface OwnerBookingsProps {
    bookings: any[];
    setBookings: React.Dispatch<React.SetStateAction<any[]>>;
    totalSeats: number;
}

export default function OwnerBookings({ bookings, setBookings, totalSeats }: OwnerBookingsProps) {
    const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
        try {
            setBookings((prev) => prev.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b)));
            toast.success(`Booking status updated to ${newStatus}`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Update status failed");
        }
    };

    return (
        <div className="space-y-6 text-left">
            <div className="flex justify-between items-center">
                <h3 className="font-display text-lg font-medium text-primary">Active Reservations</h3>
                <span className="text-xs text-black/55">Total capacity: {totalSeats} seats</span>
            </div>

            {bookings.length === 0 ? (
                <div className="bg-white border border-outline-variant/10 p-12 text-center rounded-md">
                    <Calendar size={32} className="mx-auto text-outline-variant mb-2" />
                    <p className="text-xs text-black/55 italic">No booking records found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((b) => (
                        <div
                            key={b._id}
                            className="bg-white border border-outline-variant/20 rounded-md p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                        >
                            <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-display text-base font-medium text-primary">{b.user?.name}</h4>
                                    <span className="text-[9px] text-black/50 border border-outline-variant/30 px-1.5 py-0.5">
                                        {b.bookingId}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-black/55">
                                    <span className="flex items-center gap-1">
                                        <Users size={12} /> {b.guests} Guests
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} /> {b.time} PM
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} /> {new Date(b.date).toLocaleDateString()}
                                    </span>
                                </div>
                                {b.specialRequests && (
                                    <p className="text-xs text-secondary/80 bg-secondary/5 px-3 py-1.5 rounded-sm border-l-2 border-secondary mt-2">
                                        <strong>Requests:</strong> {b.specialRequests}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                                <span
                                    className={`text-[9px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-sm ${
                                        b.status === "confirmed"
                                            ? "bg-blue-100 text-blue-800"
                                            : b.status === "completed"
                                              ? "bg-green-100 text-green-800"
                                              : "bg-error-container text-on-error-container"
                                    }`}
                                >
                                    {b.status}
                                </span>

                                {b.status === "confirmed" && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateBookingStatus(b._id, "completed")}
                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[9px] font-medium tracking-wider uppercase transition-colors rounded-sm cursor-pointer"
                                        >
                                            Complete
                                        </button>
                                        <button
                                            onClick={() => handleUpdateBookingStatus(b._id, "cancelled")}
                                            className="px-3 py-1.5 bg-error hover:bg-error/85 text-white text-[9px] font-medium tracking-wider uppercase transition-colors rounded-sm cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
