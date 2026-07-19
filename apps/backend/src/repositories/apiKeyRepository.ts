import { prisma } from './prisma';

export const apiKeyRepository = {
  async createApiKey(
    userId: string,
    name: string,
    keyHash: string,
    scopes: string[],
    expiresAt?: Date,
  ) {
    return prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        scopes,
        expiresAt,
      },
    });
  },

  async findByKeyHash(keyHash: string) {
    return prisma.apiKey.findUnique({
      where: { keyHash },
    });
  },

  async recordUse(id: string) {
    return prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  },

  async deleteApiKey(id: string) {
    return prisma.apiKey.delete({
      where: { id },
    });
  },

  async listUserApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
    });
  },
};
