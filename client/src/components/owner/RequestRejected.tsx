import { XIcon } from "lucide-react";

interface RequestRejectedProps {
    restaurantName: string;
}

export default function RequestRejected({ restaurantName }: RequestRejectedProps) {
    return (
        <div className="max-w-xl mx-auto bg-white border border-outline-variant/20 p-8 text-center shadow-sm rounded-md space-y-6">
            <XIcon size={40} className="mx-auto text-red-300" />
            <h2 className="font-display text-xl font-medium text-primary">Registration Denied</h2>
            <p className="text-sm text-black/55 leading-relaxed">
                Unfortunately, your request to list <strong>{restaurantName}</strong> has been rejected by our administration team.
            </p>
            <p className="text-xs text-black/55 italic">Please contact customer support for further information.</p>
        </div>
    );
}
