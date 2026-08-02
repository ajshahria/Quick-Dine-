import { Router } from "express";
import { getMe, loginUser, registerUser } from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";


const authRouter = Router()

authRouter.post("/register",registerUser)
authRouter.post("/login",loginUser)
authRouter.get("/register",protect,getMe)

export default authRouter;