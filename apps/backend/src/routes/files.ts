import { Router } from 'express';
import { fileController } from '../controllers/fileController';
import { authenticate } from '../middleware/authMiddleware';

const router: Router = Router();

router.get('/tree', authenticate, fileController.getTree);
router.get('/list', authenticate, fileController.listFiles);
router.post('/create', authenticate, fileController.createFile);
router.post('/delete', authenticate, fileController.deleteFile);

export default router;
