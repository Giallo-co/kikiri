import { Router } from "express";
import { UserService } from "../services/user-service.js";
import { UserController } from "../controllers/user-controller.js";
import { UserRepository } from "../repositories/user-repository.js";

const userRoutes = Router();

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

userRoutes.post("/v1/register", userController.registerUser)

userRoutes.get("/v1/simulation", userController.simulate)

userRoutes.post("/v1/friend", userController.addFriend);

export default userRoutes;