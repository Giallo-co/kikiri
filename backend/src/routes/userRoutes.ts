import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';

const router = Router();

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Rutas CRUD user
router.post("/v1/register", (req, res, next) => userController.register(req, res, next));
router.get("/v1/users/:email", (req, res, next) => userController.getByEmail(req, res, next));
router.put("/v1/users/:id", (req, res, next) => userController.update(req, res, next));
router.delete("/v1/users/:id", (req, res, next) => userController.delete(req, res, next));

// Rutas CRUD follow
router.post("/v1/friend", (req, res, next) => userController.addFriend(req, res, next));
router.get("/v1/users/:userId/friends", (req, res, next) => userController.getFriends(req, res, next));
router.put("/v1/users/:userId/friends", (req, res, next) => userController.updateFriendList(req, res, next));
router.delete("/v1/users/:userId/friends/:friendId", (req, res, next) => userController.deleteFriend(req, res, next));

// Rutas ejemplos
router.get("/v1/simulation", (req, res, next) => userController.simulate(req, res));

export default router;