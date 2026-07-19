import { Router } from 'express';
import { userController } from '../controllers/userController';
import { validateRequest, authenticate } from '../middleware/authMiddleware';
import { updateProfileValidator, changePasswordValidator } from '../validators/authValidator';

const router: Router = Router();

router.put(
  '/profile',
  authenticate,
  validateRequest(updateProfileValidator),
  userController.updateProfile,
);
router.put(
  '/password',
  authenticate,
  validateRequest(changePasswordValidator),
  userController.changePassword,
);
router.delete('/', authenticate, userController.deleteAccount);

export default router;
