import { Router } from "express";
import { UserService } from "../services/user-service.js";
import { UserController } from "../controllers/user-controller.js";

const userRoutes = Router();

const userService = new UserService();
const userController = new UserController(userService);

userRoutes.post("/v1/register", userController.registerUser)

userRoutes.get("/v1/simulation", userController.simulate);

export default userRoutes;