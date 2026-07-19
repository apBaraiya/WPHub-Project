import { userRepository } from '../repositories/userRepository';
import { hashPassword, comparePassword } from '@wphub/utils';

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },

  async updateProfile(
    userId: string,
    data: { firstName?: string | null; lastName?: string | null; avatarUrl?: string | null },
  ) {
    return userRepository.updateProfile(userId, data);
  },

  async changePassword(userId: string, currentPasswordPlain: string, newPasswordPlain: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const matches = await comparePassword(currentPasswordPlain, user.passwordHash);
    if (!matches) {
      throw new Error('Invalid current password');
    }

    const newHash = await hashPassword(newPasswordPlain);
    return userRepository.updatePassword(userId, newHash);
  },

  async deleteAccount(userId: string) {
    return userRepository.deleteUser(userId);
  },
};
