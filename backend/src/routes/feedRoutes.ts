import { Router } from 'express';
import { FeedController } from '../controllers/feedController';
import { FeedService } from '../services/feedService';
import { PostRepository } from '../repositories/postRepository';

const router = Router();

const postRepository = new PostRepository();
const feedService = new FeedService(postRepository);
const feedController = new FeedController(feedService);

router.get("v1/feed", (req, res, next) => feedController.getByUser(req, res, next));

export default router;