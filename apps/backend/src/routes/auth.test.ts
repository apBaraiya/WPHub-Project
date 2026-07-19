import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { authService } from '../services/authService';
import { Role } from '@prisma/client';

vi.mock('../services/authService');
vi.mock('../repositories/userRepository');

describe('Authentication API Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sign up new users successfully', async () => {
    const mockUser = { id: 'user-1', email: 'signup@wphub.cloud', role: Role.USER };
    (authService.register as any).mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'signup@wphub.cloud', password: 'SecurePassword1!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toEqual('signup@wphub.cloud');
  });

  it('should prevent signup with invalid email formats', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalidemail', password: 'SecurePassword1!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Validation failed');
  });

  it('should authenticate users and set HttpOnly cookie', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'login@wphub.cloud',
      role: Role.USER,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
    };
    (authService.login as any).mockResolvedValue({
      user: mockUser,
      accessToken: 'valid_access_token',
      refreshToken: 'valid_refresh_token',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@wphub.cloud', password: 'SecurePassword1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual('valid_access_token');

    // Verify refresh token cookie is set
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('refresh_token=valid_refresh_token');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('should process refresh token rotation successfully', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'login@wphub.cloud',
      role: Role.USER,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
    };
    (authService.refresh as any).mockResolvedValue({
      user: mockUser,
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refresh_token=valid_refresh_token']);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual('new_access_token');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies[0]).toContain('refresh_token=new_refresh_token');
  });

  it('should set long cookie expiry if rememberMe is enabled', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'login@wphub.cloud',
      role: Role.USER,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
    };
    (authService.login as any).mockResolvedValue({
      user: mockUser,
      accessToken: 'valid_access_token',
      refreshToken: 'valid_refresh_token',
      rememberMe: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@wphub.cloud', password: 'SecurePassword1!', rememberMe: true });

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('Max-Age=2592000'); // 30 days in seconds
  });

  it('should return rate limiting headers on login route', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'login@wphub.cloud',
      role: Role.USER,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
    };
    (authService.login as any).mockResolvedValue({
      user: mockUser,
      accessToken: 'valid_access_token',
      refreshToken: 'valid_refresh_token',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@wphub.cloud', password: 'SecurePassword1!' });

    expect(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']).toBeDefined();
  });
});
