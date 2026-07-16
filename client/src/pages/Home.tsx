/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer.tsx";
import AuthModal from "../components/AuthModal.tsx";
import Hero from "../components/home/Hero.tsx";
import CuisineBrowse from "../components/home/CuisineBrowse.tsx";
import TrendingRow from "../components/home/TrendingRow.tsx";
import MembershipSection from "../components/home/MembershipSection.tsx";
import NewsletterCTA from "../components/home/NewsletterCTA.tsx";
import { dummyFeaturedRestaurants } from "../assets/assets.ts";

export default function Home() {
    const [trending, setTrending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrending = async () => {
            setTrending(dummyFeaturedRestaurants);
            setLoading(false);
        };
        fetchTrending();
    }, []);

    return (
        <div className="min-h-screen bg-surface flex flex-col pt-0">
            <Navbar />
            <AuthModal />
            <main className="flex-1">
                <Hero />
                <CuisineBrowse />
                <TrendingRow trending={trending} loading={loading} />
                <MembershipSection />
                <NewsletterCTA />
            </main>
            <Footer />
        </div>
    );
}
