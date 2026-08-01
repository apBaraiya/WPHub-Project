import { Router } from 'express';
import { siteController } from '../controllers/siteController';
import { authenticate } from '../middleware/authMiddleware';

const router: Router = Router();

router.get('/', authenticate, siteController.getAllSites);
router.post('/', authenticate, siteController.create);
router.delete('/:id', authenticate, siteController.delete);
router.get('/preview-domain', siteController.previewByDomain);
router.get('/preview-domain-internal', siteController.previewByDomain);
router.get('/preview/:siteId', siteController.preview);
router.get('/:id/progress', siteController.streamProgress);

export default router;
