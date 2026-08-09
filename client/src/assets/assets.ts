import hero_bg_img from "./hero_bg_img.png";
import default_restaurant_img from "./default_restaurant_Img.jpeg";
import membership_section_img from "./membership_section_img.png";
import {
    BeefIcon,
    Building2Icon,
    CroissantIcon,
    FishIcon,
    GlobeIcon,
    LeafIcon,
    MailIcon,
    Share2Icon,
    UtensilsCrossedIcon,
} from "lucide-react";

export const assets = {
    hero_bg_img,
    default_restaurant_img,
    membership_section_img,
};

export const dummyReviews = [
    {
        _id: "dummy-rev-1",
        userName: "Emily Watson",
        rating: 5,
        comment: "Absolutely phenomenal experience! The ambiance was perfect, and the food was cooked to perfection. A must-visit!",
        visitedDate: "2026-06-10T12:00:00.000Z",
        createdAt: "2026-06-10T12:00:00.000Z",
    },
    {
        _id: "dummy-rev-2",
        userName: "Marcus Vance",
        rating: 4,
        comment:
            "The signature dishes were incredible and the staff was extremely attentive. Will definitely come back for another dinner.",
        visitedDate: "2026-06-08T18:30:00.000Z",
        createdAt: "2026-06-08T18:30:00.000Z",
    },
    {
        _id: "dummy-rev-3",
        userName: "Sophia Loren",
        rating: 5,
        comment: "Every course of the tasting menu was a delightful surprise. The pairings were exquisite. High-end dining at its finest.",
        visitedDate: "2026-06-05T20:15:00.000Z",
        createdAt: "2026-06-05T20:15:00.000Z",
    },
];

export const dummyRating = 4.8;
export const dummyReviewCount = 124;

export const footerSections = [
    {
        title: "COMPANY",
        links: [
            { label: "About Us", path: "#" },
            { label: "Partner with Us", path: "#" },
            { label: "Careers", path: "#" },
        ],
    },
    {
        title: "LEGAL",
        links: [
            { label: "Terms of Service", path: "#" },
            { label: "Privacy Policy", path: "#" },
            { label: "Cookies", path: "#" },
        ],
    },
];

export const socialLinks = [
    { icon: GlobeIcon, href: "#" },
    { icon: Share2Icon, href: "#" },
    { icon: MailIcon, href: "#" },
];

export const bottomLinks = [
    { label: "Terms", path: "#" },
    { label: "Privacy", path: "#" },
];

export const cuisines = [
    { name: "Italian", icon: UtensilsCrossedIcon, label: "ITALIAN" },
    { name: "Japanese", icon: FishIcon, label: "SUSHI" },
    { name: "French", icon: CroissantIcon, label: "FRENCH" },
    { name: "Rooftop", icon: Building2Icon, label: "ROOFTOP" },
    { name: "Steakhouse", icon: BeefIcon, label: "STEAKHOUSE" },
    { name: "Vegetarian", icon: LeafIcon, label: "VEGETARIAN" },
];

export const dummyUser = {
    _id: "6a32a3c50e88c825d8873f75",
    name: "Alex Mercer",
    email: "alex@example.com",
    phone: "+01234567788",
    role: "owner",
    token: "xyz",
    createdAt: "2026-06-17T13:40:21.669Z",
    updatedAt: "2026-06-17T13:40:21.669Z",
};

export const dummyRestaurant = [];

export const dummyAvailability = [
    { time: "18:00", availableSeats: 45, isAvailable: true },
    { time: "19:00", availableSeats: 45, isAvailable: true },
    { time: "20:00", availableSeats: 45, isAvailable: true },
    { time: "21:00", availableSeats: 45, isAvailable: true },
    { time: "22:00", availableSeats: 45, isAvailable: true },
];

export const dummyBookingData = {
    user: "6a32a3c50e88c825d8873f75",
    restaurant: {
        _id: "6a32a3c50e88c825d8873f7d",
        name: "L'Essence",
        location: "Manhattan, NY",
        address: "115 Greenwich St, New York, NY 10006",
        image: "/restaurant_5.png",
    },
    date: "2026-06-25T00:00:00.000Z",
    time: "22:00",
    guests: 2,
    occasion: "",
    specialRequests: "",
    status: "confirmed",
    _id: "6a34e4caf866d0ae1e98e487",
    createdAt: "2026-06-19T06:42:18.305Z",
    updatedAt: "2026-06-19T06:42:18.305Z",
    bookingId: "GR-71B448A7",
};

export const dummyMyBookingsData = [
    {
        _id: "6a34e4caf866d0ae1e98e487",
        user: "6a32a3c50e88c825d8873f75",
        restaurant: {
            _id: "6a32a3c50e88c825d8873f7d",
            name: "L'Essence",
            slug: "l-essence",
            location: "Manhattan, NY",
            address: "115 Greenwich St, New York, NY 10006",
            image: "/restaurant_5.png",
        },
        date: "2026-06-25T00:00:00.000Z",
        time: "22:00",
        guests: 2,
        occasion: "",
        specialRequests: "",
        status: "confirmed",
        createdAt: "2026-06-19T06:42:18.305Z",
        updatedAt: "2026-06-19T06:42:18.305Z",
        bookingId: "GR-71B448A7",
    },
    {
        _id: "6a34e55af866d0ae1e98e489",
        user: "6a32a3c50e88c825d8873f75",
        restaurant: {
            _id: "6a32a3c50e88c825d8873f7a",
            name: "Terraza Cielo",
            slug: "terraza-cielo",
            location: "Manhattan, NY",
            address: "244 Fifth Ave Rooftop, New York, NY 10001",
            image: "/restaurant_3.jpg",
        },
        date: "2026-06-19T00:00:00.000Z",
        time: "20:00",
        guests: 2,
        occasion: "",
        specialRequests: "",
        status: "confirmed",
        createdAt: "2026-06-19T06:44:42.294Z",
        updatedAt: "2026-06-19T06:44:42.294Z",
        bookingId: "GR-17743C76",
    },
    {
        _id: "6a34e54ff866d0ae1e98e488",
        user: "6a32a3c50e88c825d8873f75",
        restaurant: {
            _id: "6a32a3c50e88c825d8873f78",
            name: "L'Artiste",
            slug: "l-artiste",
            location: "Manhattan, NY",
            address: "420 Mercer St, New York, NY 10003",
            image: "/restaurant_4.png",
        },
        date: "2026-06-19T00:00:00.000Z",
        time: "19:00",
        guests: 2,
        occasion: "",
        specialRequests: "",
        status: "confirmed",
        createdAt: "2026-06-19T06:44:31.052Z",
        updatedAt: "2026-06-19T06:44:31.052Z",
        bookingId: "GR-F82DDD63",
    },
];

export const dummyAdminStats = {
    users: { totalUsers: 1, totalOwners: 1, total: 2 },
    restaurants: { total: 6 },
    bookings: { total: 1 },
    latestBookings: [
        {
            _id: "6a34f88580587be1dada87ba",
            user: { _id: "6a34ef24a4d96fc34d9c906b", name: "Marc Dubois", email: "owner@example.com" },
            restaurant: { _id: "6a34ef24a4d96fc34d9c906d", name: "Kuro Omakase" },
            date: "2026-06-19T00:00:00.000Z",
            time: "20:30",
            guests: 2,
            occasion: "",
            specialRequests: "",
            status: "confirmed",
            createdAt: "2026-06-19T08:06:29.155Z",
            updatedAt: "2026-06-19T08:06:29.155Z",
            bookingId: "GR-EB39904C",
        },
    ],
};

export const dummyFeaturedRestaurants = [dummyRestaurant[0], dummyRestaurant[1], dummyRestaurant[2]];
