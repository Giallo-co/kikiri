import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { S3PresignService } from '../services/s3PresignService';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
const uploadController = new UploadController(new S3PresignService());

router.post('/v1/uploads/presign', authenticateToken, (req, res, next) => uploadController.presign(req, res, next));

export default router;
