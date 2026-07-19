import { Request, Response, NextFunction } from 'express';
import { installerEngine } from '../services/installerEngine';
import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb } from '../repositories/inMemoryDb';

export const installerController = {
  async install(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        siteId,
        appName,
        appVersion,
        protocol,
        domain,
        directory,
        siteName,
        siteDescription,
        adminUser,
        adminPass,
        adminEmail,
        dbName,
        dbPrefix,
      } = req.body;

      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Fire and forget background installer task
      installerEngine.runInstallation(userId, {
        siteId,
        appName,
        appVersion,
        protocol,
        domain,
        directory: directory || '',
        siteName: siteName || 'WordPress Site',
        siteDescription: siteDescription || 'My WordPress Blog',
        adminUser: adminUser || 'admin',
        adminPass: adminPass || 'SecurePassword1!',
        adminEmail: adminEmail || 'admin@site.com',
        dbName: dbName || 'wp_db',
        dbPrefix: dbPrefix || 'wp_',
      });

      res.status(202).json({
        success: true,
        message: 'Application installation initialized successfully in background.',
      });
    } catch (err) {
      next(err);
    }
  },

  streamProgress(req: Request, res: Response) {
    const { siteId } = req.params;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const sendUpdate = (step: string, progress: number) => {
      res.write(`data: ${JSON.stringify({ step, progress })}\n\n`);
    };

    // Initialize progress feedback
    sendUpdate('Initializing...', 5);

    installerEngine.registerProgressCallback(siteId, sendUpdate);

    req.on('close', () => {
      installerEngine.unregisterProgressCallback(siteId);
    });
  },

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (isDbOffline) {
        const history = inMemoryDb.installHistories.filter((h) => h.userId === userId);
        res.status(200).json({ success: true, data: history });
      } else {
        const history = await prisma.installHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: history });
      }
    } catch (err) {
      next(err);
    }
  },
};
