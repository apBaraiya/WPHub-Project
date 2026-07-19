import { Router } from 'express';
import { domainController } from '../controllers/domainController';
import { authenticate } from '../middleware/authMiddleware';

const router: Router = Router();

router.post('/check', authenticate, domainController.check);
router.post('/create', authenticate, domainController.create);

export default router;
