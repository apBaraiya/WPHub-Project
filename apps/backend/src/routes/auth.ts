import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validateRequest, authenticate } from '../middleware/authMiddleware';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
} from '../validators/authValidator';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  authActionLimiter,
} from '../middleware/rateLimiter';

const router: Router = Router();

router.post(
  '/register',
  registerLimiter,
  validateRequest(registerValidator),
  authController.register,
);
router.post('/login', loginLimiter, validateRequest(loginValidator), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.getMe);
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateRequest(forgotPasswordValidator),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  authActionLimiter,
  validateRequest(resetPasswordValidator),
  authController.resetPassword,
);
router.post(
  '/verify-email',
  authActionLimiter,
  validateRequest(verifyEmailValidator),
  authController.verifyEmail,
);

export default router;
