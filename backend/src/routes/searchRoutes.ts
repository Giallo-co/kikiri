import { Router } from 'express';
import { SearchController } from '../controllers/searchController';

const router = Router();
const searchController = new SearchController();

router.get('/v1/search/users', (req, res, next) => searchController.searchUsers(req, res, next));

router.get('/v1/search/users/:id', (req, res, next) => searchController.getUser(req, res, next));

export default router;