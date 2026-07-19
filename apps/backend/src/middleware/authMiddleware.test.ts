import { describe, it, expect, vi } from 'vitest';
import { validateRequest, authenticate, requireRole } from './authMiddleware';
import { z } from 'zod';
import { authService } from '../services/authService';
import { Role } from '@prisma/client';

describe('Auth & RBAC Middleware', () => {
  it('should validate payloads using zod schema in validateRequest', async () => {
    const schema = z.object({ email: z.string().email() });
    const middleware = validateRequest(schema);

    const req = { body: { email: 'invalid-email' } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();

    const validReq = { body: { email: 'test@wphub.cloud' } } as any;
    const validRes = {} as any;
    const validNext = vi.fn();

    await middleware(validReq, validRes, validNext);
    expect(validNext).toHaveBeenCalled();
  });

  it('should authenticate requests with correct authorization headers', async () => {
    const spy = vi.spyOn(authService, 'verifyAccessToken').mockReturnValue({
      userId: 'user-id-123',
      email: 'user@wphub.cloud',
      role: Role.USER,
    });

    const req = {
      headers: { authorization: 'Bearer valid_token' },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user?.userId).toEqual('user-id-123');
    expect(next).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('should prevent access to restricted endpoints based on role in requireRole', () => {
    const middleware = requireRole([Role.ADMIN, Role.OWNER]);

    const req = { user: { role: Role.USER } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();

    const authorizedReq = { user: { role: Role.ADMIN } } as any;
    const authorizedNext = vi.fn();

    middleware(authorizedReq, {} as any, authorizedNext);
    expect(authorizedNext).toHaveBeenCalled();
  });
});
