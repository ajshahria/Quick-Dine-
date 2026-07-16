/* eslint-disable @typescript-eslint/no-explicit-any */
import { Star } from "lucide-react";
import { dummyReviews } from "../../assets/assets.ts";

export default function RestaurantReviews() {
    return (
        <section className="space-y-8 pt-6 border-t border-outline-variant/10 text-left">
            <h3 className="font-display text-xl font-semibold text-primary">Guest Experiences</h3>

            {/* Reviews list */}
            <div className="space-y-6">
                {dummyReviews.length === 0 ? (
                    <p className="text-xs text-black/55/80 italic">No reviews yet. Be the first to share your experience!</p>
                ) : (
                    dummyReviews.map((r: any) => (
                        <div key={r._id} className="pb-6 border-b border-outline-variant/10 last:border-b-0 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-primary">{r.userName}</h4>
                                    <span className="text-xs text-black/55">Visited {new Date(r.visitedDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-0.5 text-secondary">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            size={12}
                                            fill={i < r.rating ? "currentColor" : "none"}
                                            className={i < r.rating ? "" : "text-outline-variant"}
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-black/55 max-w-lg leading-relaxed">{r.comment}</p>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
