import { Router } from "express";
import { getMe, loginUser, registerUser, logoutUser } from "../controllers/authController.js";
import { csrfToken } from "../middlewares/csrf.js";
import { rateLimit } from "express-rate-limit";
import { protect } from "../middlewares/auth.js";


const authRouter = Router()
const loginLimiter = rateLimit({ windowMs:15 * 60 * 1000, limit:30, standardHeaders:"draft-8", legacyHeaders:false, message:{message:"Too many sign-in attempts; try again later"} });
authRouter.get("/csrf", csrfToken);
authRouter.post("/logout", logoutUser);

authRouter.post("/register",loginLimiter,registerUser)
authRouter.post("/login",loginLimiter,loginUser)
authRouter.get("/me",protect,getMe)

export default authRouter;
