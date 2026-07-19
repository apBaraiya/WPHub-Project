import { Request, Response, NextFunction } from 'express';
import { domainService } from '../services/domainService';

export const domainController = {
  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, extension } = req.body;
      const result = await domainService.checkAvailability(name, extension);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, extension } = req.body;
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
        return;
      }

      const domain = await domainService.createDomain(userId, name, extension);
      res.status(201).json({
        success: true,
        data: domain,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Domain registration failed', code: 'BAD_REQUEST' },
      });
    }
  },
};
