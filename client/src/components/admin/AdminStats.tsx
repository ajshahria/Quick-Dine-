/* eslint-disable @typescript-eslint/no-explicit-any */
import { Users, ShieldCheck, Utensils, Calendar } from "lucide-react";

interface AdminStatsProps {
    stats: any;
}

export default function AdminStats({ stats }: AdminStatsProps) {
    if (!stats) return null;

    const kpiCards = [
        { title: "Active Diners", value: stats.users?.totalUsers, icon: Users },
        { title: "Partners", value: stats.users?.totalOwners, icon: ShieldCheck },
        { title: "Total Venues", value: stats.restaurants?.total, icon: Utensils },
        { title: "Bookings", value: stats.bookings?.total, icon: Calendar },
    ];

    return (
        <div className="space-y-8 text-left">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {kpiCards.map(({ title, value, icon: Icon }) => (
                    <div key={title} className="bg-white border border-outline-variant/20 p-5 rounded-md shadow-sm space-y-2">
                        <span className="text-[10px] font-medium tracking-wider text-black/55 uppercase flex items-center gap-1.5">
                            <Icon size={12} className="text-secondary" />
                            {title}
                        </span>
                        <h4 className="font-display text-2xl font-medium text-primary">{value}</h4>
                    </div>
                ))}
            </div>

            {/* Recent Bookings */}
            <div className="space-y-4">
                <h3 className="font-display text-lg font-medium text-primary">Recent Bookings Activity</h3>

                {stats.latestBookings?.length === 0 ? (
                    <p className="text-xs text-black/40 italic">No bookings recorded on the platform.</p>
                ) : (
                    <div className="bg-white border border-outline-variant/20 rounded-md overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant/10 text-[10px] tracking-wider text-black/55 uppercase">
                                    {["Ref Code", "Diner", "Restaurant", "Details", "Status"].map((header) => (
                                        <th key={header} className={`p-4 ${header === "Status" ? "text-right" : ""}`}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-outline-variant/10">
                                {stats.latestBookings.map((b: any) => (
                                    <tr key={b._id} className="hover:bg-surface/50">
                                        <td className="p-4 text-primary">{b.bookingId}</td>

                                        <td className="p-4">
                                            <div className="text-primary">{b.user?.name}</div>
                                            <div className="text-[10px] text-black/50">{b.user?.email}</div>
                                        </td>

                                        <td className="p-4 text-primary">{b.restaurant?.name || "Deleted Restaurant"}</td>

                                        <td className="p-4 text-black/55">
                                            {new Date(b.date).toLocaleDateString()} at {b.time} PM • {b.guests} Guests
                                        </td>

                                        <td className="p-4 text-right">
                                            <span
                                                className={`inline-block py-0.5 px-2 text-[9px] tracking-wider uppercase rounded-sm ${
                                                    b.status === "confirmed"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : b.status === "completed"
                                                          ? "bg-green-100 text-green-800"
                                                          : "bg-error-container text-on-error-container"
                                                }`}
                                            >
                                                {b.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
