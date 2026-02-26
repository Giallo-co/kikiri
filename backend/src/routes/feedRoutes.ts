import { Router } from 'express';
import { FeedController } from '../controllers/feedController';
import { FeedService } from '../services/feedService';
import { PostRepository } from '../repositories/postRepository';
import { UserRepository } from '../repositories/userRepository';

const router = Router();

const postRepository = new PostRepository();
//se hace la instancia para poder usar userId en la generación del feed. 
// A futuro hay que instanciar solamente en app.ts y pasarlo como argumento para los distintos routes, controller, services, etc.
const userRepository = new UserRepository();
const feedService = new FeedService(postRepository, userRepository);
const feedController = new FeedController(feedService);

router.get("/v1/feed/:userId", (req, res, next) => feedController.getFeed(req, res, next));

export default router;