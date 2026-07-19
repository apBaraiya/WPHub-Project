import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userRepository } from './userRepository';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

vi.mock('./prisma', () => ({
  isDbOffline: false,
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userProfile: {
      update: vi.fn(),
    },
    loginHistory: {
      create: vi.fn(),
    },
  },
}));

describe('User Database Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve users by email', async () => {
    const mockUser = { id: 'user-1', email: 'test@wphub.cloud', role: Role.USER };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const user = await userRepository.findByEmail('test@wphub.cloud');

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@wphub.cloud' },
      }),
    );
    expect(user).toEqual(mockUser);
  });

  it('should insert new users with correct defaults', async () => {
    const mockUser = { id: 'new-user', email: 'register@wphub.cloud', role: Role.USER };
    (prisma.user.create as any).mockResolvedValue(mockUser);

    const result = await userRepository.create('register@wphub.cloud', 'hashed-pass');

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'register@wphub.cloud',
          passwordHash: 'hashed-pass',
          role: Role.USER,
        }),
      }),
    );
    expect(result).toEqual(mockUser);
  });

  it('should invoke user profile update correctly', async () => {
    const mockProfile = { id: 'prof-1', userId: 'user-1', firstName: 'Jane' };
    (prisma.userProfile.update as any).mockResolvedValue(mockProfile);

    const result = await userRepository.updateProfile('user-1', { firstName: 'Jane' });

    expect(prisma.userProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        data: { firstName: 'Jane' },
      }),
    );
    expect(result).toEqual(mockProfile);
  });
});
