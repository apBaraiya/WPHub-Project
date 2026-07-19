import { Router } from 'express';
import { databaseController } from '../controllers/databaseController';
import { authenticate } from '../middleware/authMiddleware';

const router: Router = Router();

router.get('/', authenticate, databaseController.getAll);
router.post('/', authenticate, databaseController.create);
router.delete('/:id', authenticate, databaseController.delete);

export default router;
