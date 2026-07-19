import { describe, it, expect, vi } from 'vitest';
import { mailService } from './mailService';

describe('MailService Templates and Integrations', () => {
  it('should compile verification email templates with correct CTA links', async () => {
    const sendSpy = vi.spyOn(mailService, 'sendEmail').mockResolvedValue(undefined);

    await mailService.sendVerificationEmail('user@wphub.cloud', 'valid_verification_token');

    expect(sendSpy).toHaveBeenCalledWith(
      'user@wphub.cloud',
      expect.stringContaining('Verify your email address'),
      expect.stringContaining('verify-email?token=valid_verification_token'),
      expect.stringContaining('valid_verification_token'),
    );

    sendSpy.mockRestore();
  });

  it('should compile password recovery templates with secure links', async () => {
    const sendSpy = vi.spyOn(mailService, 'sendEmail').mockResolvedValue(undefined);

    await mailService.sendPasswordResetEmail('user@wphub.cloud', 'valid_reset_token');

    expect(sendSpy).toHaveBeenCalledWith(
      'user@wphub.cloud',
      expect.stringContaining('Reset your password'),
      expect.stringContaining('reset-password?token=valid_reset_token'),
      expect.stringContaining('valid_reset_token'),
    );

    sendSpy.mockRestore();
  });
});
