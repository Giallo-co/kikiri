import { Router } from 'express';
import { UserPostController } from '../controllers/userPostController';
import { UserPostService } from '../services/userPostService';
import { UserPostRepository } from '../repositories/userPostRepository';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
const userPostRepository = new UserPostRepository();
const userPostService = new UserPostService(userPostRepository);
const userPostController = new UserPostController(userPostService);

router.post('/v1/user-posts', authenticateToken, (req, res, next) => userPostController.create(req, res, next));
router.get('/v1/user-posts/:userId', authenticateToken, (req, res, next) => userPostController.listByUser(req, res, next));

export default router;
