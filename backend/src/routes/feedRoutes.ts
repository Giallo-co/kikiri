import { Router } from 'express';
import { FeedController } from '../controllers/feedController';
import { FeedService } from '../services/feedService';
import { PostRepository } from '../repositories/postRepository';
import { UserRepository } from '../repositories/userRepository';

const router = Router();

const postRepository = new PostRepository();
const userRepository = new UserRepository();
const feedService = new FeedService(postRepository, userRepository);
const feedController = new FeedController(feedService);

router.get("/v1/feed/:userId", (req, res, next) => feedController.getFeed(req, res, next));

export default router;