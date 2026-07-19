import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';

export const userController = {
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        });
        return;
      }

      const { firstName, lastName, avatarUrl } = req.body;
      const profile = await userService.updateProfile(req.user.userId, {
        firstName,
        lastName,
        avatarUrl,
      });

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      await userService.changePassword(req.user.userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        data: { message: 'Password updated successfully' },
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        });
        return;
      }

      await userService.deleteAccount(req.user.userId);
      res.clearCookie('refresh_token');

      res.status(200).json({
        success: true,
        data: { message: 'Account deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  },
};
