import mongoose from "mongoose";
let connectionPromise = null;
mongoose.connection.on("connected", () => {
    console.log("MongoDB Connected");
});
const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is not configured");
    }
    if (mongoose.connection.readyState === 1) {
        return;
    }
    if (!connectionPromise) {
        connectionPromise = mongoose.connect(uri).catch((error) => {
            connectionPromise = null;
            throw error;
        });
    }
    await connectionPromise;
};
export default connectDB;
