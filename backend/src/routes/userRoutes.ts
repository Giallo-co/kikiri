import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';

const router = Router();

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

router.post("/v1/register", (req, res, next) => userController.register(req, res, next));
router.get("/v1/users/:email", (req, res, next) => userController.getByEmail(req, res, next));
router.put("/v1/users/:id", (req, res, next) => userController.update(req, res, next));
router.delete("/v1/users/:id", (req, res, next) => userController.delete(req, res, next));


export default router;