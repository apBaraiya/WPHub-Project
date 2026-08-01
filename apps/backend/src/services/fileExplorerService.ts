import fs from 'fs';
import path from 'path';
import { logger } from '@wphub/utils';
import { siteResolver } from './siteResolver';

const WORKSPACE_ROOT = path.resolve(process.cwd());
const SITES_DIR = path.join(WORKSPACE_ROOT, 'sites');

export interface FileExplorerNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  permissions: string;
  updatedAt: string;
  children?: FileExplorerNode[];
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getOctalPermissions(mode: number): string {
  return '0' + (mode & 0o777).toString(8);
}

function getSiteRoot(siteId: string): string {
  const loc = siteResolver.getSite(siteId);
  if (loc && loc.webRoot && fs.existsSync(loc.webRoot)) {
    return loc.webRoot;
  }
  return path.join(SITES_DIR, siteId, 'public_html');
}

export const fileExplorerService = {
  /**
   * Recursively walks the folders under public_html to generate a directory tree list.
   */
  async getDirectoryTree(siteId: string): Promise<FileExplorerNode[]> {
    const siteRoot = getSiteRoot(siteId);
    if (!fs.existsSync(siteRoot)) {
      return [];
    }

    const walk = async (currentPath: string, relativePath: string): Promise<FileExplorerNode[]> => {
      const items = await fs.promises.readdir(currentPath, { withFileTypes: true });
      const nodes: FileExplorerNode[] = [];

      for (const item of items) {
        if (item.isDirectory()) {
          const itemRelPath = relativePath ? `${relativePath}/${item.name}` : item.name;
          const fullPath = path.join(currentPath, item.name);
          const stats = await fs.promises.stat(fullPath);

          nodes.push({
            id: Buffer.from(itemRelPath).toString('base64'),
            name: item.name,
            type: 'folder',
            permissions: getOctalPermissions(stats.mode),
            updatedAt: stats.mtime.toISOString().replace('T', ' ').substring(0, 16),
            children: await walk(fullPath, itemRelPath),
          });
        }
      }
      return nodes;
    };

    try {
      const folders = await walk(siteRoot, '');
      // Return public_html folder at root wrapping all items
      const rootStats = await fs.promises.stat(siteRoot);
      return [
        {
          id: Buffer.from('public_html').toString('base64'),
          name: 'public_html',
          type: 'folder',
          permissions: getOctalPermissions(rootStats.mode),
          updatedAt: rootStats.mtime.toISOString().replace('T', ' ').substring(0, 16),
          children: folders,
        },
      ];
    } catch (err: any) {
      logger.error(`Error walking directories for site ${siteId}: ${err.message}`);
      return [];
    }
  },

  /**
   * Lists the immediate child items (both files and folders) of a target folder.
   */
  async listImmediateFolderContents(
    siteId: string,
    relativePath: string,
  ): Promise<FileExplorerNode[]> {
    const cleanRelPath =
      relativePath === 'public_html' ? '' : relativePath.replace(/^public_html\/?/, '');
    const siteRoot = getSiteRoot(siteId);
    const folderPath = path.join(siteRoot, cleanRelPath);

    if (!fs.existsSync(folderPath)) {
      return [];
    }

    try {
      const items = await fs.promises.readdir(folderPath, { withFileTypes: true });
      const result: FileExplorerNode[] = [];

      for (const item of items) {
        const fullPath = path.join(folderPath, item.name);
        const stats = await fs.promises.stat(fullPath);
        const itemRelPath = cleanRelPath ? `${cleanRelPath}/${item.name}` : item.name;

        result.push({
          id: Buffer.from(itemRelPath).toString('base64'),
          name: item.name,
          type: item.isDirectory() ? 'folder' : 'file',
          size: item.isDirectory() ? undefined : formatBytes(stats.size),
          permissions: getOctalPermissions(stats.mode),
          updatedAt: stats.mtime.toISOString().replace('T', ' ').substring(0, 16),
        });
      }
      return result;
    } catch (err: any) {
      logger.error(`Error listing files in ${relativePath} for site ${siteId}: ${err.message}`);
      return [];
    }
  },

  /**
   * Deletes a file or directory recursively.
   */
  async deletePath(siteId: string, relativePath: string): Promise<boolean> {
    const cleanRelPath =
      relativePath === 'public_html' ? '' : relativePath.replace(/^public_html\/?/, '');
    const siteRoot = getSiteRoot(siteId);
    const targetPath = path.join(siteRoot, cleanRelPath);

    if (!fs.existsSync(targetPath)) {
      throw new Error('Path not found');
    }

    try {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
      return true;
    } catch (err: any) {
      throw new Error(`Delete failed: ${err.message}`);
    }
  },

  /**
   * Creates a new file or directory on the file system.
   */
  async createResource(
    siteId: string,
    relativePath: string,
    name: string,
    isFolder: boolean,
  ): Promise<boolean> {
    const cleanRelPath =
      relativePath === 'public_html' ? '' : relativePath.replace(/^public_html\/?/, '');
    const siteRoot = getSiteRoot(siteId);
    const targetFolder = path.join(siteRoot, cleanRelPath);
    const targetPath = path.join(targetFolder, name);

    if (!fs.existsSync(targetFolder)) {
      await fs.promises.mkdir(targetFolder, { recursive: true });
    }

    try {
      if (isFolder) {
        await fs.promises.mkdir(targetPath, { recursive: true });
      } else {
        await fs.promises.writeFile(targetPath, '');
      }
      return true;
    } catch (err: any) {
      throw new Error(`Creation failed: ${err.message}`);
    }
  },
};
