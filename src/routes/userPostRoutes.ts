import { Router } from 'express';
import { UserPostController } from '../controllers/userPostController';
import { UserPostService } from '../services/userPostService';
import { UserPostRepository } from '../repositories/userPostRepository';
import { UserRepository } from '../repositories/userRepository';
import { AlbumController } from '../controllers/albumController';
import { AlbumPublishService } from '../services/albumPublishService';
import { AlbumGraphService } from '../services/albumGraphService';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
const userPostRepository = new UserPostRepository();
const userPostService = new UserPostService(userPostRepository);
const userPostController = new UserPostController(userPostService);

const userRepository = new UserRepository();
export const albumController = new AlbumController(
  new AlbumPublishService(userRepository, new AlbumGraphService())
);

router.post('/v1/user-posts', authenticateToken, (req, res, next) => userPostController.create(req, res, next));
router.get('/v1/user-posts/:userId', authenticateToken, (req, res, next) => userPostController.listByUser(req, res, next));

router.post('/v1/albums/publish', authenticateToken, (req, res, next) => albumController.publish(req, res, next));
router.post('/album/upload', authenticateToken, (req, res, next) => albumController.publish(req, res, next));

export default router;
