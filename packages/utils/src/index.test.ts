import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateSecureToken,
  isValidDomain,
} from './index';

describe('Utility Cryptography Helpers', () => {
  it('should hash and compare passwords correctly', async () => {
    const password = 'SecurePass123!';
    const hashed = await hashPassword(password);
    expect(hashed).toBeDefined();
    expect(hashed).not.toEqual(password);

    const matches = await comparePassword(password, hashed);
    expect(matches).toBe(true);

    const fails = await comparePassword('wrong_password', hashed);
    expect(fails).toBe(false);
  });

  it('should hash tokens using SHA-256 correctly', () => {
    const rawToken = 'my_raw_refresh_token';
    const hashed = hashToken(rawToken);
    expect(hashed).toHaveLength(64); // SHA-256 in hex has length 64

    // Matching token produces identical hash
    expect(hashToken(rawToken)).toEqual(hashed);
  });

  it('should generate secure tokens of 64 characters (hex of 32 bytes)', () => {
    const token = generateSecureToken();
    expect(token).toBeDefined();
    expect(token).toHaveLength(64);
  });

  it('should validate domain formats correctly', () => {
    expect(isValidDomain('wphub.cloud')).toBe(true);
    expect(isValidDomain('sub.domain.wphub.cloud')).toBe(true);
    expect(isValidDomain('not-a-domain')).toBe(false);
    expect(isValidDomain('http://wphub.cloud')).toBe(false);
  });
});
