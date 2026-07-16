/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext.tsx";
import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer.tsx";
import { ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "../components/Loader.tsx";
import BookingSuccess from "../components/booking/BookingSuccess.tsx";
import BookingSummary from "../components/booking/BookingSummary.tsx";
import BookingForm from "../components/booking/BookingForm.tsx";
import { dummyBookingData, dummyRestaurant } from "../assets/assets.ts";

export default function BookingConfirmation() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const { user } = useAppContext();
    const navigate = useNavigate();

    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

    // Form inputs
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [occasion, setOccasion] = useState("");
    const [specialRequests, setSpecialRequests] = useState("");

    // From Query Params
    const slot = searchParams.get("slot") || "";
    const date = searchParams.get("date") || "";
    const guests = searchParams.get("guests") || "2";

    useEffect(() => {
        // Prefill form when user details load
        if (user) {
            (() => {
                setName(user.name);
                setEmail(user.email);
                if (user.phone) setPhone(user.phone);
            })();
        }
    }, [user]);

    useEffect(() => {
        const fetchRestaurant = async () => {
            setRestaurant(dummyRestaurant.find((r) => r.slug === slug));
            setLoading(false);
        };

        if (slug) {
            fetchRestaurant();
        }
    }, [slug, navigate]);

    if (loading) {
        return <Loader text="Retrieving Dining Details..." />;
    }

    if (!restaurant) return null;

    const handleConfirmSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!slot || !date) {
            toast.error("Reservation details are missing. Return to restaurant details.");
            return;
        }

        try {
            setConfirming(true);
            setConfirmedBooking(dummyBookingData);
            toast.success("Reservation confirmed!");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message);
        } finally {
            setConfirming(false);
        }
    };

    // Render Success Screen
    if (confirmedBooking) {
        return (
            <div className="min-h-screen bg-surface flex flex-col pt-20">
                <Navbar />
                <main className="grow flex items-center justify-center py-12 px-6">
                    <BookingSuccess confirmedBooking={confirmedBooking} restaurant={restaurant} date={date} slot={slot} guests={guests} />
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col pt-20">
            <Navbar />

            {/* Main Booking Content */}
            <main className="grow max-w-7xl w-full mx-auto px-6 md:px-10 py-12">
                {/* Progress bar header */}
                <div className="flex items-center gap-2 mb-10 pb-4 border-b border-outline-variant/10 text-xs text-black/55">
                    <Link to={`/restaurant/${restaurant.slug}`} className="hover:text-primary transition-colors">
                        {restaurant.name}
                    </Link>
                    <ChevronRight size={14} />
                    <span className="text-primary">Details & Confirmation</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* Left Column (Reservation Summary) */}
                    <div className="lg:col-span-5">
                        <BookingSummary restaurant={restaurant} date={date} slot={slot} guests={guests} />
                    </div>

                    {/* Right Column (Guest Details Form) */}
                    <div className="lg:col-span-7">
                        <BookingForm
                            name={name}
                            setName={setName}
                            email={email}
                            setEmail={setEmail}
                            phone={phone}
                            setPhone={setPhone}
                            occasion={occasion}
                            setOccasion={setOccasion}
                            specialRequests={specialRequests}
                            setSpecialRequests={setSpecialRequests}
                            confirming={confirming}
                            onSubmit={handleConfirmSubmit}
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
