import { Router } from 'express';
import { installerController } from '../controllers/installerController';
import { authenticate } from '../middleware/authMiddleware';

const router: Router = Router();

router.post('/install', authenticate, installerController.install);
router.get('/progress/:siteId', installerController.streamProgress);
router.get('/history', authenticate, installerController.getHistory);

export default router;
