import { Request, Response, NextFunction } from 'express';
import { fileExplorerService } from '../services/fileExplorerService';

export const fileController = {
  async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteId } = req.query;
      if (!siteId) {
        res.status(400).json({ success: false, error: 'Site ID parameter is required' });
        return;
      }

      const tree = await fileExplorerService.getDirectoryTree(siteId as string);
      res.status(200).json({ success: true, data: tree });
    } catch (err) {
      next(err);
    }
  },

  async listFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteId, path } = req.query;
      if (!siteId) {
        res.status(400).json({ success: false, error: 'Site ID parameter is required' });
        return;
      }

      const files = await fileExplorerService.listImmediateFolderContents(
        siteId as string,
        (path as string) || '',
      );
      res.status(200).json({ success: true, data: files });
    } catch (err) {
      next(err);
    }
  },

  async deleteFile(req: Request, res: Response) {
    try {
      const { siteId, path } = req.body;
      if (!siteId || !path) {
        res.status(400).json({ success: false, error: 'Site ID and Path parameters are required' });
        return;
      }

      await fileExplorerService.deletePath(siteId, path);
      res.status(200).json({ success: true, message: 'Resource deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Deletion failed' });
    }
  },

  async createFile(req: Request, res: Response) {
    try {
      const { siteId, path: parentPath, name, isFolder } = req.body;
      if (!siteId || !name) {
        res.status(400).json({ success: false, error: 'Site ID and Resource Name are required' });
        return;
      }

      await fileExplorerService.createResource(siteId, parentPath || '', name, !!isFolder);
      res.status(201).json({ success: true, message: 'Resource created successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Creation failed' });
    }
  },
};
