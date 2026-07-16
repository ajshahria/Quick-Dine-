/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext.tsx";
import Navbar from "../../components/Navbar.tsx";
import Footer from "../../components/Footer.tsx";
import Loader from "../../components/Loader.tsx";
import { CalendarIcon, SettingsIcon } from "lucide-react";
import RestaurantWizard from "../../components/owner/RestaurantWizard.tsx";
import PendingApproval from "../../components/owner/PendingApproval.tsx";
import RequestRejected from "../../components/owner/RequestRejected.tsx";
import OwnerBookings from "../../components/owner/OwnerBookings.tsx";
import OwnerProfileDetails from "../../components/owner/OwnerProfileDetails.tsx";
import { dummyMyBookingsData, dummyRestaurant } from "../../assets/assets.ts";

export default function OwnerDashboard() {
    const { logout } = useAppContext();
    const [restaurant, setRestaurant] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"bookings" | "details">("bookings");

    const fetchOwnerData = async () => {
        setRestaurant(dummyRestaurant[0]);
        setBookings(dummyMyBookingsData);
        setLoading(false);
    };

    useEffect(() => {
        (async () => await fetchOwnerData())();
    }, []);

    if (loading) {
        return <Loader text="Loading Owner Dashboard..." />;
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col pt-20">
            <Navbar />

            <main className="grow max-w-7xl w-full mx-auto px-6 md:px-10 py-12">
                {/* Heading */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/10 pb-8 mb-8">
                    <div>
                        <h1 className="font-display text-2xl md:text-3xl text-primary">Restaurant Portal</h1>
                        <p className="text-xs text-black/55 mt-1.5">Review capacity limits and process live reservations.</p>
                    </div>
                    <button
                        onClick={logout}
                        className="bg-error-container hover:bg-error-container/85 text-error px-4 py-2 text-[10px] font-medium tracking-widest uppercase transition-colors"
                    >
                        Sign Out
                    </button>
                </div>

                {/* Case 1: No Restaurant Setup Profile */}
                {!restaurant ? (
                    <RestaurantWizard setRestaurant={setRestaurant} />
                ) : restaurant.status === "pending" ? (
                    /* Case 2: Profile Pending Approval */
                    <PendingApproval restaurant={restaurant} />
                ) : restaurant.status === "rejected" ? (
                    /* Case 3: Rejected */
                    <RequestRejected restaurantName={restaurant.name} />
                ) : (
                    /* Case 4: Approved - Full Dashboard Panel */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Left Tab selector sidebar */}
                        <aside className="lg:col-span-3 space-y-6 bg-white border border-outline-variant/20 p-6 rounded-md shadow-sm h-fit">
                            <div className="flex items-center gap-3.5 border-b border-outline-variant/10 pb-5">
                                <span className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-base">
                                    {restaurant.name.charAt(0)}
                                </span>
                                <div>
                                    <h4 className="font-display font-medium text-primary text-base line-clamp-1">{restaurant.name}</h4>
                                    <span className="text-[9px] text-secondary tracking-widest uppercase bg-secondary-container/20 px-2 py-0.5 rounded-sm inline-block mt-0.5">
                                        APPROVED
                                    </span>
                                </div>
                            </div>

                            <nav className="flex flex-col gap-1.5">
                                <button
                                    onClick={() => setActiveTab("bookings")}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium tracking-wider uppercase text-left rounded-sm cursor-pointer transition-colors ${
                                        activeTab === "bookings" ? "bg-primary text-white" : "text-black/55 hover:bg-surface"
                                    }`}
                                >
                                    <CalendarIcon size={14} />
                                    Bookings ({bookings.length})
                                </button>

                                <button
                                    onClick={() => setActiveTab("details")}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium tracking-wider uppercase text-left rounded-sm cursor-pointer transition-colors ${
                                        activeTab === "details" ? "bg-primary text-white" : "text-black/55 hover:bg-surface"
                                    }`}
                                >
                                    <SettingsIcon size={14} />
                                    Profile Details
                                </button>
                            </nav>
                        </aside>

                        {/* Content Area */}
                        <div className="lg:col-span-9 space-y-8">
                            {/* Tab 1: Bookings List */}
                            {activeTab === "bookings" && (
                                <OwnerBookings bookings={bookings} setBookings={setBookings} totalSeats={restaurant.totalSeats} />
                            )}

                            {/* Tab 3: Update details & slots capacity */}
                            {activeTab === "details" && <OwnerProfileDetails restaurant={restaurant} setRestaurant={setRestaurant} />}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
