/* eslint-disable @typescript-eslint/no-explicit-any */
import { Calendar, Users, Clock, MapPin } from "lucide-react";

interface BookingSummaryProps {
    restaurant: any;
    date: string;
    slot: string;
    guests: string;
}

export default function BookingSummary({ restaurant, date, slot, guests }: BookingSummaryProps) {
    if (!restaurant) return null;

    return (
        <div className="bg-white border border-outline-variant/20 p-6 rounded-md shadow-sm space-y-6 text-left">
            <h3 className="font-display text-lg text-primary pb-3 border-b border-outline-variant/10">Reservation Summary</h3>

            {/* Restaurant Info Header */}
            <div className="flex gap-4">
                <div className="w-24 h-24 overflow-hidden rounded-sm shrink-0">
                    <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] text-secondary tracking-widest uppercase">{restaurant.cuisine}</span>
                    <h4 className="font-display text-base font-medium text-primary leading-tight">{restaurant.name}</h4>
                    <p className="text-xs text-black/55 flex items-center gap-1">
                        <MapPin size={12} />
                        {restaurant.location}
                    </p>
                </div>
            </div>

            {/* Date/Time/Guests lists */}
            <div className="border-t border-b border-outline-variant/10 py-5 space-y-3 text-xs text-on-surface">
                <div className="flex justify-between items-center">
                    <span className="text-black/55 flex items-center gap-2">
                        <Calendar size={14} /> Date
                    </span>
                    <span>{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-black/55 flex items-center gap-2">
                        <Clock size={14} /> Time
                    </span>
                    <span>{slot} PM</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-black/55 flex items-center gap-2">
                        <Users size={14} /> Party Size
                    </span>
                    <span>{guests} Guests</span>
                </div>
            </div>

            {/* Policy */}
            <div className="space-y-2">
                <h5 className="text-[10px] font-medium tracking-wider text-primary uppercase">CANCELLATION POLICY</h5>
                <p className="text-xs text-black/55 leading-relaxed">
                    We hold reservations for a maximum of 15 minutes. Cancellations or changes can be made free of charge up to 24 hours in
                    advance.
                </p>
            </div>
        </div>
    );
}
