/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Utensils, Upload, Image } from "lucide-react";
import toast from "react-hot-toast";
import { dummyRestaurant } from "../../assets/assets.ts";

interface RestaurantWizardProps {
    setRestaurant: (restaurant: any) => void;
}

export default function RestaurantWizard({ setRestaurant }: RestaurantWizardProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [cuisine, setCuisine] = useState("");
    const [priceRange, setPriceRange] = useState("$$");
    const [location, setLocation] = useState("");
    const [address, setAddress] = useState("");
    const [chef, setChef] = useState("");
    const [tags, setTags] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [availableSlots, setAvailableSlots] = useState<string[]>([
        "17:00",
        "17:30",
        "18:00",
        "18:30",
        "19:00",
        "19:30",
        "20:00",
        "20:30",
        "21:00",
        "21:30",
    ]);
    const [totalSeats, setTotalSeats] = useState("20");
    const [formLoading, setFormLoading] = useState(false);

    const defaultSlots = [
        "12:00",
        "13:00",
        "14:00",
        "17:00",
        "17:30",
        "18:00",
        "18:30",
        "19:00",
        "19:30",
        "20:00",
        "20:30",
        "21:00",
        "21:30",
    ];

    const toggleSlot = (slot: string) => {
        if (availableSlots.includes(slot)) {
            setAvailableSlots(availableSlots.filter((s) => s !== slot));
        } else {
            setAvailableSlots([...availableSlots, slot].sort());
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleCreateRestaurant = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("cuisine", cuisine);
            formData.append("priceRange", priceRange);
            formData.append("location", location);
            formData.append("address", address);
            formData.append("chef", chef);
            formData.append("tags", tags);
            formData.append("availableSlots", availableSlots.join(","));
            formData.append("totalSeats", totalSeats);
            if (imageFile) {
                formData.append("image", imageFile);
            }

            setRestaurant(dummyRestaurant[0]);
            toast.success("Restaurant profile submitted successfully! Awaiting Admin approval.");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to register restaurant");
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white border border-outline-variant/20 p-8 md:p-10 shadow-sm rounded-md space-y-6">
            <div className="text-center space-y-2 pb-6 border-b border-outline-variant/10">
                <Utensils size={36} className="mx-auto text-secondary" />
                <h2 className="font-display text-xl font-medium text-primary">Setup Restaurant Profile</h2>
                <p className="text-xs text-black/55">
                    Please create your restaurant details. Once submitted, it will be pending approval from the Admin.
                </p>
            </div>

            <form onSubmit={handleCreateRestaurant} className="space-y-5 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Restaurant Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. L'Artiste"
                            className="w-full bg-surface-container-low/30 border border-outline-variant/40 px-3 py-2.5 text-xs focus:border-secondary focus:outline-none rounded-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Cuisine Type</label>
                        <input
                            type="text"
                            required
                            value={cuisine}
                            onChange={(e) => setCuisine(e.target.value)}
                            placeholder="e.g. French, Omakase"
                            className="w-full bg-surface-container-low/30 border border-outline-variant/40 px-3 py-2.5 text-xs focus:border-secondary focus:outline-none rounded-sm"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Description</label>
                    <textarea
                        required
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the gastronomical experience, atmosphere, and dining philosophy..."
                        className="w-full bg-surface-container-low/30 border border-outline-variant/40 p-3 text-xs focus:border-secondary focus:outline-none rounded-sm"
                    ></textarea>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-1">
                    <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Restaurant Cover Image</label>
                    <div className="flex flex-col md:flex-row gap-4 items-center bg-surface-container-low/30 border border-outline-variant/40 p-4 rounded-sm">
                        <div className="relative w-32 h-24 bg-surface border border-outline-variant/30 rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Image size={24} className="text-black/30" />
                            )}
                        </div>
                        <div className="grow space-y-2 text-center md:text-left w-full">
                            <p className="text-[11px] text-black/55 leading-relaxed">
                                Upload a high-resolution banner photo for your restaurant page. Supports JPG, PNG.
                            </p>
                            <label className="inline-flex items-center gap-1.5 px-4 py-2 border border-outline-variant/40 hover:border-primary hover:text-primary transition-colors text-[10px] font-medium tracking-wider uppercase rounded-sm cursor-pointer bg-white">
                                <Upload size={12} />
                                {imageFile ? "Change Image" : "Upload Image"}
                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            </label>
                            {imageFile && <span className="block text-[10px] text-secondary font-medium">Selected: {imageFile.name}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Price Range</label>
                        <select
                            value={priceRange}
                            onChange={(e) => setPriceRange(e.target.value)}
                            className="w-full bg-surface-container-low/30 border border-outline-variant/40 px-3 py-2.5 text-xs focus:border-secondary focus:outline-none rounded-sm"
                        >
                            <option value="$">$ (Casual)</option>
                            <option value="$$">$$ (Moderate)</option>
                            <option value="$$$">$$$ (Upscale)</option>
                            <option value="$$$$">$$$$ (Fine Dining)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Location (City)</label>
                        <input
                            type="text"
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Manhattan, NY"
                            className="w-full bg-surface-container-low/30 border border-outline-variant/40 px-3 py-2.5 text-xs focus:border-secondary focus:outline-none rounded-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">
                            Total Capacity (Seats)
                        </label>
                        <input
                            type="number"
                            min="1"
                            required
                            value={totalSeats}
                            onChange={(e) => setTotalSeats(e.target.value)}
                            className="w-full bg-surface-container-low/30 border border-outline-variant/40 px-3 py-2.5 text-xs focus:border-secondary focus:outline-none rounded-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Address</label>
                        <input
                            type="text"
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="123 Gastronomy Lane, New York"
                            className="w-full bg-surface-container-low/30 border border-outline-variant/40 px-3 py-2.5 text-xs focus:border-secondary focus:outline-none rounded-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Executive Chef</label>
                        <input
                            type="text"
                            required
                            value={chef}
                            onChange={(e) => setChef(e.target.value)}
                            placeholder="Chef Jean-Luc"
                            className="w-full bg-surface-container-low/30 border border-outline-variant/40 px-3 py-2.5 text-xs focus:border-secondary focus:outline-none rounded-sm"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Tags (comma separated)</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Michelin Star, Romantic, Rooftop"
                        className="w-full bg-surface-container-low/30 border border-outline-variant/40 px-3 py-2.5 text-xs focus:border-secondary focus:outline-none rounded-sm"
                    />
                </div>

                <div className="space-y-2">
                    <span className="block text-[10px] font-medium text-black/55 tracking-wider uppercase">Available Slots</span>
                    <div className="flex flex-wrap gap-2">
                        {defaultSlots.map((slot) => {
                            const isSelected = availableSlots.includes(slot);
                            return (
                                <button
                                    key={slot}
                                    type="button"
                                    onClick={() => toggleSlot(slot)}
                                    className={`py-1.5 px-3 text-[10px] border transition-colors cursor-pointer rounded-sm ${
                                        isSelected
                                            ? "bg-primary border-primary text-white"
                                            : "border-outline-variant/40 text-black/55 hover:border-primary"
                                    }`}
                                >
                                    {slot}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full bg-primary hover:bg-secondary text-white text-xs font-medium tracking-widest uppercase py-3.5 transition-colors cursor-pointer"
                >
                    {formLoading ? "SUBMITTING..." : "REGISTER RESTAURANT"}
                </button>
            </form>
        </div>
    );
}
