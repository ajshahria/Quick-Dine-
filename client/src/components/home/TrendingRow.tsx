/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import RestaurantCard from "../RestaurantCard.tsx";

interface TrendingRowProps {
    trending: any[];
    loading: boolean;
}

export default function TrendingRow({ trending, loading }: TrendingRowProps) {
    return (
        <section className="py-24 bg-surface-container-low/50">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <span className="text-[10px] text-secondary tracking-[0.2em] block mb-2 uppercase">
                            CURRENTLY TRENDING
                        </span>
                        <h2 className="font-display text-2xl md:text-3xl font-semibold text-primary">Trending Fine Dining</h2>
                    </div>
                    <Link
                        to="/search"
                        className="text-xs text-secondary hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                        VIEW ALL <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-2 border-outline-variant/30 border-t-secondary rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trending.slice(0, 3).map((r) => (
                            <RestaurantCard key={r._id} restaurant={r} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
