import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Rutas CRUD user
router.post("/v1/register", (req, res, next) => userController.register(req, res, next));
router.post("/v1/login", (req, res, next) => userController.login(req, res, next));
router.get("/v1/users/email/:email", authenticateToken, (req, res, next) => userController.getByEmail(req, res, next));
router.get("/v1/users/id/:id", authenticateToken, (req, res, next) => userController.getById(req, res, next));
router.patch("/v1/users/:id/profile-picture", authenticateToken, (req, res, next) => userController.patchProfilePicture(req, res, next));
router.put("/v1/users/:id", authenticateToken, (req, res, next) => userController.update(req, res, next));
router.delete("/v1/users/:id", authenticateToken, (req, res, next) => userController.delete(req, res, next));

// Rutas CRUD follow, menos update
router.post("/v1/users/:userId/follow/:targetId", authenticateToken, (req, res, next) => userController.follow(req, res, next));
router.delete("/v1/users/:userId/follow/:targetId", authenticateToken, (req, res, next) => userController.unfollow(req, res, next));
router.get("/v1/users/:userId/following", authenticateToken, (req, res, next) => userController.getFollowing(req, res, next));

// Rutas ejemplos
router.get("/v1/simulation", authenticateToken, (req, res, next) => userController.simulate(req, res));

export default router;