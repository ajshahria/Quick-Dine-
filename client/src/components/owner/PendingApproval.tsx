/* eslint-disable @typescript-eslint/no-explicit-any */
import { Info } from "lucide-react";

interface PendingApprovalProps {
    restaurant: any;
}

export default function PendingApproval({ restaurant }: PendingApprovalProps) {
    return (
        <div className="max-w-xl mx-auto bg-white border border-outline-variant/20 p-8 text-center shadow-sm rounded-md space-y-6">
            <Info size={40} className="mx-auto text-secondary animate-pulse" />
            <h2 className="font-display text-xl text-primary">Registration Pending Approval</h2>
            <p className="text-sm text-black/55 leading-relaxed">
                Thank you for registering <span className="text-black">{restaurant?.name}</span>. Your profile details and slots listing are
                currently under review by our Master Admin.
            </p>
            <div className="border border-outline-variant/10 bg-surface-container-low/20 p-4 rounded-sm text-left space-y-1 text-xs text-black/65">
                <p>
                    <strong>Cuisine:</strong> {restaurant?.cuisine}
                </p>
                <p>
                    <strong>Location:</strong> {restaurant?.location}
                </p>
                <p>
                    <strong>Capacity:</strong> {restaurant?.totalSeats} seats
                </p>
                <p>
                    <strong>Status:</strong>{" "}
                    <span className="text-secondary font-medium tracking-wider uppercase text-[9px] bg-secondary-container/20 px-2 py-0.5 rounded-sm">
                        PENDING
                    </span>
                </p>
            </div>
            <p className="text-[10px] text-black/40 italic">
                You will receive full booking access as soon as your restaurant status is marked as APPROVED.
            </p>
        </div>
    );
}
