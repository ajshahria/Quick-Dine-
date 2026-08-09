import "dotenv/config";
import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import restaurantRouter from "./routes/restaurantRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import adminRouter from "./routes/adminRoutes.js";


const app = express();

// Middleware
app.use(cors())
app.use(express.json());

const port = process.env.PORT || 5000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        next(error);
    }
});

app.use("/api/auth",authRouter)
app.use("/api/restaurants",restaurantRouter)
app.use("/api/bookings",bookingRouter)
app.use("/api/owner",ownerRouter)
app.use("/api/admin",adminRouter)



app.use((err:Error,req:Request,res: Response,next:NextFunction)=>{
    console.error("Unhandled Error:",err);
    res.status(500).json({
        message:err.message||"Internal Server Error",
        stack:process.env.NODE_ENV==="production"?undefined:err.stack,
    });
})

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export default app;
