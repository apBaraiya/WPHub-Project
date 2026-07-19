import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository';
import { tokenRepository } from '../repositories/tokenRepository';
import { sessionRepository } from '../repositories/sessionRepository';
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateSecureToken,
  logger,
} from '@wphub/utils';
import { Role } from '@prisma/client';
import { mailService } from './mailService';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'wphub_saas_access_super_secret';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export const authService = {
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
  },

  async register(email: string, passwordPlain: string, role: Role = Role.USER) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error('Email is already registered');
    }
    const passwordHash = await hashPassword(passwordPlain);
    const user = await userRepository.create(email, passwordHash, role);

    // Automatically trigger email verification request boilerplate
    await this.requestEmailVerification(user.id, user.email);

    return user;
  },

  async login(
    email: string,
    passwordPlain: string,
    userAgent: string | null,
    ipAddress: string | null,
    rememberMe: boolean = false,
  ) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const matches = await comparePassword(passwordPlain, user.passwordHash);
    if (!matches) {
      await userRepository.logLogin(user.id, ipAddress, userAgent, 'FAILED');
      throw new Error('Invalid email or password');
    }

    await userRepository.logLogin(user.id, ipAddress, userAgent, 'SUCCESS');

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshPlain = generateSecureToken();
    const refreshHash = hashToken(refreshPlain);
    const refreshExpires = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);

    await tokenRepository.createRefreshToken(user.id, refreshHash, refreshExpires);
    await sessionRepository.createSession(user.id, userAgent, ipAddress, refreshExpires);

    return {
      user,
      accessToken,
      refreshToken: refreshPlain,
      rememberMe,
    };
  },

  async refresh(refreshTokenPlain: string, userAgent: string | null, ipAddress: string | null) {
    const refreshHash = hashToken(refreshTokenPlain);
    const dbToken = await tokenRepository.findRefreshToken(refreshHash);

    if (!dbToken) {
      throw new Error('Invalid refresh token');
    }

    if (dbToken.isRevoked) {
      // Security warning: possible token reuse detected!
      // Revoke all tokens for this user
      await tokenRepository.revokeAllUserRefreshTokens(dbToken.userId);
      await sessionRepository.invalidateAllUserSessions(dbToken.userId);
      logger.warn(
        `Security Warning: Revoked refresh token reuse attempted for user ${dbToken.userId}`,
      );
      throw new Error('Token compromised. Please re-authenticate.');
    }

    if (new Date() > dbToken.expiresAt) {
      await tokenRepository.revokeRefreshToken(refreshHash);
      throw new Error('Expired refresh token');
    }

    const user = await userRepository.findById(dbToken.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Revoke old refresh token (rotation)
    await tokenRepository.revokeRefreshToken(refreshHash);

    // Issue new tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const rememberMe =
      dbToken.expiresAt.getTime() - dbToken.createdAt.getTime() > 8 * 24 * 60 * 60 * 1000;
    const refreshExpires = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);

    const newRefreshPlain = generateSecureToken();
    const newRefreshHash = hashToken(newRefreshPlain);

    await tokenRepository.createRefreshToken(user.id, newRefreshHash, refreshExpires);
    await sessionRepository.createSession(user.id, userAgent, ipAddress, refreshExpires);

    return {
      user,
      accessToken,
      refreshToken: newRefreshPlain,
      rememberMe,
    };
  },

  async logout(refreshTokenPlain: string) {
    const refreshHash = hashToken(refreshTokenPlain);
    const dbToken = await tokenRepository.findRefreshToken(refreshHash);
    if (dbToken) {
      await tokenRepository.revokeRefreshToken(refreshHash);
      await tokenRepository.revokeAllUserRefreshTokens(dbToken.userId);
    }
  },

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
    } catch (err: any) {
      throw new Error('Invalid access token');
    }
  },

  async requestPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't leak user presence
      return;
    }

    const resetPlain = generateSecureToken();
    const resetHash = hashToken(resetPlain);
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await tokenRepository.createPasswordResetToken(user.id, resetHash, expiresAt);

    // Send real email via MailService
    await mailService.sendPasswordResetEmail(email, resetPlain);
  },

  async resetPassword(resetTokenPlain: string, newPasswordPlain: string) {
    const resetHash = hashToken(resetTokenPlain);
    const dbToken = await tokenRepository.findPasswordResetToken(resetHash);

    if (!dbToken || dbToken.isUsed || new Date() > dbToken.expiresAt) {
      throw new Error('Invalid or expired reset token');
    }

    await tokenRepository.usePasswordResetToken(resetHash);
    const newPasswordHash = await hashPassword(newPasswordPlain);
    await userRepository.updatePassword(dbToken.userId, newPasswordHash);
    await tokenRepository.revokeAllUserRefreshTokens(dbToken.userId); // force re-login on all devices
  },

  async requestEmailVerification(userId: string, email: string) {
    const verificationPlain = generateSecureToken();
    const verificationHash = hashToken(verificationPlain);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await tokenRepository.createEmailVerificationToken(userId, verificationHash, expiresAt);

    // Send real email via MailService
    await mailService.sendVerificationEmail(email, verificationPlain);
  },

  async verifyEmail(verificationTokenPlain: string) {
    const verificationHash = hashToken(verificationTokenPlain);
    const dbToken = await tokenRepository.findEmailVerificationToken(verificationHash);

    if (!dbToken || dbToken.isUsed || new Date() > dbToken.expiresAt) {
      throw new Error('Invalid or expired verification token');
    }

    await tokenRepository.useEmailVerificationToken(verificationHash);
    await userRepository.verifyEmail(dbToken.userId);
  },
};
