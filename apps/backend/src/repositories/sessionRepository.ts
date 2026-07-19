import { prisma, isDbOffline } from './prisma';
import { inMemoryDb } from './inMemoryDb';

export const sessionRepository = {
  async createSession(
    userId: string,
    userAgent: string | null,
    ipAddress: string | null,
    expiresAt: Date,
  ) {
    if (isDbOffline) {
      const sess = {
        id: 'sess-' + Math.random().toString(36).substr(2, 9),
        userId,
        userAgent,
        ipAddress,
        expiresAt,
        isActive: true,
        createdAt: new Date(),
      };
      inMemoryDb.sessions.push(sess);
      return sess;
    }
    return prisma.session.create({
      data: {
        userId,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
  },

  async findSession(id: string) {
    if (isDbOffline) {
      return inMemoryDb.sessions.find((s) => s.id === id) || null;
    }
    return prisma.session.findUnique({
      where: { id },
    });
  },

  async invalidateSession(id: string) {
    if (isDbOffline) {
      const s = inMemoryDb.sessions.find((s) => s.id === id);
      if (s) {
        s.isActive = false;
        return s;
      }
      return null;
    }
    return prisma.session.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async invalidateAllUserSessions(userId: string) {
    if (isDbOffline) {
      let count = 0;
      inMemoryDb.sessions.forEach((s) => {
        if (s.userId === userId && s.isActive) {
          s.isActive = false;
          count++;
        }
      });
      return { count };
    }
    return prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  },
};
