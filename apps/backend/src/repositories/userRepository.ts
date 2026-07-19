import { prisma, isDbOffline } from './prisma';
import { inMemoryDb } from './inMemoryDb';
import { Role } from '@prisma/client';

export const userRepository = {
  async findByEmail(email: string) {
    if (isDbOffline) {
      const u = inMemoryDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return u || null;
    }
    return prisma.user.findUnique({
      where: { email },
      include: { profile: true, settings: true, preferences: true },
    });
  },

  async findById(id: string) {
    if (isDbOffline) {
      const u = inMemoryDb.users.find((u) => u.id === id);
      return u || null;
    }
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true, settings: true, preferences: true },
    });
  },

  async create(email: string, passwordHash: string, role: Role = Role.USER) {
    if (isDbOffline) {
      const newUserId = 'usr-' + Math.random().toString(36).substr(2, 9);
      const newUser = {
        id: newUserId,
        email,
        passwordHash,
        role,
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {
          id: 'prof-' + Math.random().toString(36).substr(2, 9),
          userId: newUserId,
          firstName: null,
          lastName: null,
          avatarUrl: null,
        },
        settings: {
          id: 'sett-' + Math.random().toString(36).substr(2, 9),
          userId: newUserId,
          twoFactorEnabled: false,
        },
        preferences: {
          id: 'pref-' + Math.random().toString(36).substr(2, 9),
          userId: newUserId,
          theme: 'dark',
          notificationsEnabled: true,
        },
      };
      inMemoryDb.users.push(newUser);
      return newUser;
    }

    return prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        profile: {
          create: {},
        },
        settings: {
          create: {},
        },
        preferences: {
          create: {},
        },
      },
      include: { profile: true, settings: true, preferences: true },
    });
  },

  async updateProfile(
    userId: string,
    data: { firstName?: string | null; lastName?: string | null; avatarUrl?: string | null },
  ) {
    if (isDbOffline) {
      const u = inMemoryDb.users.find((u) => u.id === userId);
      if (u && u.profile) {
        u.profile = { ...u.profile, ...data };
        return u.profile;
      }
      return null;
    }
    return prisma.userProfile.update({
      where: { userId },
      data,
    });
  },

  async updatePassword(userId: string, passwordHash: string) {
    if (isDbOffline) {
      const u = inMemoryDb.users.find((u) => u.id === userId);
      if (u) {
        u.passwordHash = passwordHash;
        return u;
      }
      return null;
    }
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  async verifyEmail(userId: string) {
    if (isDbOffline) {
      const u = inMemoryDb.users.find((u) => u.id === userId);
      if (u) {
        u.isEmailVerified = true;
        return u;
      }
      return null;
    }
    return prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  },

  async deleteUser(userId: string) {
    if (isDbOffline) {
      const idx = inMemoryDb.users.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        const deleted = inMemoryDb.users[idx];
        inMemoryDb.users.splice(idx, 1);
        return deleted;
      }
      return null;
    }
    return prisma.user.delete({
      where: { id: userId },
    });
  },

  async logLogin(
    userId: string,
    ipAddress: string | null,
    userAgent: string | null,
    status: 'SUCCESS' | 'FAILED',
  ) {
    if (isDbOffline) {
      const log = {
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        userId,
        ipAddress,
        userAgent,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryDb.loginHistories.push(log);
      return log;
    }
    return prisma.loginHistory.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        status,
      },
    });
  },
};
