import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { userRepository } from '../repositories/userRepository';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const user = await authService.register(email, password);
      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, rememberMe } = req.body;
      const ip = req.ip || null;
      const ua = req.headers['user-agent'] || null;

      const {
        user,
        accessToken,
        refreshToken,
        rememberMe: isRemembered,
      } = await authService.login(
        email,
        password,
        ua,
        ip,
        rememberMe === true || rememberMe === 'true',
      );

      const cookieOptions = {
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
        maxAge: isRemembered ? 30 * 24 * 60 * 60 * 1000 : undefined,
      };

      res.cookie('refresh_token', refreshToken, cookieOptions);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refresh_token || req.body.refreshToken;
      if (token) {
        await authService.logout(token);
      }
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refresh_token || req.body.refreshToken;
      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Refresh token is required',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      const ip = req.ip || null;
      const ua = req.headers['user-agent'] || null;

      const { user, accessToken, refreshToken, rememberMe } = await authService.refresh(
        token,
        ua,
        ip,
      );

      const cookieOptions = {
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined,
      };

      res.cookie('refresh_token', refreshToken, cookieOptions);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        });
        return;
      }
      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'User not found', code: 'NOT_FOUND' },
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
          },
          profile: user.profile,
          preferences: user.preferences,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset(email);
      res.status(200).json({
        success: true,
        data: { message: 'If the email exists, a password reset link has been dispatched' },
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);
      res.status(200).json({
        success: true,
        data: { message: 'Password has been reset successfully' },
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      await authService.verifyEmail(token);
      res.status(200).json({
        success: true,
        data: { message: 'Email has been verified successfully' },
      });
    } catch (error) {
      next(error);
    }
  },
};
