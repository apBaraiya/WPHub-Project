import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { siteService } from '../services/siteService';

vi.mock('../services/siteService');
vi.mock('../middleware/authMiddleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'test@wphub.cloud', role: 'USER' };
    next();
  },
  validateRequest: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Sites CRUD and Streaming Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all sites for an authenticated user', async () => {
    const mockSites = [{ id: 'site-1', name: 'My Site', domain: 'mysite.com', status: 'ACTIVE' }];
    (siteService.getAllSites as any).mockResolvedValue(mockSites);

    const res = await request(app).get('/api/sites');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockSites);
    expect(siteService.getAllSites).toHaveBeenCalledWith('test-user-id');
  });

  it('should allow users to trigger site creation', async () => {
    const mockSite = {
      id: 'site-1',
      name: 'My New Site',
      domain: 'newsite.com',
      status: 'PROVISIONING',
    };
    (siteService.createSite as any).mockResolvedValue(mockSite);

    const res = await request(app)
      .post('/api/sites')
      .send({ name: 'My New Site', domain: 'newsite.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockSite);
    expect(siteService.createSite).toHaveBeenCalledWith(
      'test-user-id',
      'My New Site',
      'newsite.com',
    );
  });

  it('should handle site deletion requests', async () => {
    (siteService.deleteSite as any).mockResolvedValue(true);

    const res = await request(app).delete('/api/sites/site-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(siteService.deleteSite).toHaveBeenCalledWith('test-user-id', 'site-1');
  });

  it('should establish SSE progress streams', async () => {
    const res = await request(app).get('/api/sites/site-1/progress');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
  });
});
