import { prisma, isDbOffline } from './prisma';
import { inMemoryDb } from './inMemoryDb';

export const tokenRepository = {
  // Refresh Tokens
  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    if (isDbOffline) {
      const token = {
        id: 'tok-' + Math.random().toString(36).substr(2, 9),
        userId,
        tokenHash,
        expiresAt,
        isRevoked: false,
        createdAt: new Date(),
      };
      inMemoryDb.refreshTokens.push(token);
      return token;
    }
    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  },

  async findRefreshToken(tokenHash: string) {
    if (isDbOffline) {
      return inMemoryDb.refreshTokens.find((t) => t.tokenHash === tokenHash) || null;
    }
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  },

  async revokeRefreshToken(tokenHash: string) {
    if (isDbOffline) {
      const t = inMemoryDb.refreshTokens.find((t) => t.tokenHash === tokenHash);
      if (t) {
        t.isRevoked = true;
        return t;
      }
      return null;
    }
    return prisma.refreshToken.update({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  },

  async revokeAllUserRefreshTokens(userId: string) {
    if (isDbOffline) {
      let count = 0;
      inMemoryDb.refreshTokens.forEach((t) => {
        if (t.userId === userId && !t.isRevoked) {
          t.isRevoked = true;
          count++;
        }
      });
      return { count };
    }
    return prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  // Password Reset Tokens
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    if (isDbOffline) {
      inMemoryDb.passwordResetTokens.forEach((t) => {
        if (t.userId === userId && !t.isUsed) {
          t.isUsed = true;
        }
      });
      const token = {
        id: 'pr-' + Math.random().toString(36).substr(2, 9),
        userId,
        tokenHash,
        expiresAt,
        isUsed: false,
        createdAt: new Date(),
      };
      inMemoryDb.passwordResetTokens.push(token);
      return token;
    }

    await prisma.passwordResetToken.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });

    return prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  },

  async findPasswordResetToken(tokenHash: string) {
    if (isDbOffline) {
      return inMemoryDb.passwordResetTokens.find((t) => t.tokenHash === tokenHash) || null;
    }
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
  },

  async usePasswordResetToken(tokenHash: string) {
    if (isDbOffline) {
      const t = inMemoryDb.passwordResetTokens.find((t) => t.tokenHash === tokenHash);
      if (t) {
        t.isUsed = true;
        return t;
      }
      return null;
    }
    return prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { isUsed: true },
    });
  },

  // Email Verification Tokens
  async createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    if (isDbOffline) {
      inMemoryDb.emailVerificationTokens.forEach((t) => {
        if (t.userId === userId && !t.isUsed) {
          t.isUsed = true;
        }
      });
      const token = {
        id: 'ev-' + Math.random().toString(36).substr(2, 9),
        userId,
        tokenHash,
        expiresAt,
        isUsed: false,
        createdAt: new Date(),
      };
      inMemoryDb.emailVerificationTokens.push(token);
      return token;
    }

    await prisma.emailVerificationToken.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });

    return prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  },

  async findEmailVerificationToken(tokenHash: string) {
    if (isDbOffline) {
      return inMemoryDb.emailVerificationTokens.find((t) => t.tokenHash === tokenHash) || null;
    }
    return prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
  },

  async useEmailVerificationToken(tokenHash: string) {
    if (isDbOffline) {
      const t = inMemoryDb.emailVerificationTokens.find((t) => t.tokenHash === tokenHash);
      if (t) {
        t.isUsed = true;
        return t;
      }
      return null;
    }
    return prisma.emailVerificationToken.update({
      where: { tokenHash },
      data: { isUsed: true },
    });
  },
};
