import { model, Schema } from "mongoose";
const RestaurantSchema = new Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true },
    cuisine: { type: String, trim: true, required: true },
    priceRange: { type: String, enum: ["$", "$$", "$$$", "$$$$"], required: true },
    rating: { type: Number, default: 5.0, min: 1, max: 5 },
    reviewCount: { type: Number, default: 0 },
    location: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    image: { type: String, default: "" },
    chef: { type: String, required: true },
    tags: [{ type: String }],
    availableSlots: [{ type: String }],
    featured: { type: Boolean, default: false },
    exclusive: { type: Boolean, default: false },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    totalSeats: { type: Number, default: 20 },
}, { timestamps: true });
export const Restaurant = model("Restaurant", RestaurantSchema);
