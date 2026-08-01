import { Request, Response, NextFunction } from 'express';
import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb, saveInMemoryDb } from '../repositories/inMemoryDb';
import { runtimeManager } from '../services/runtimeManager';
import { logger } from '@wphub/utils';

// Helper to estimate database size and table counts based on CMS/framework script type
function getDatabaseMetrics(scriptType: string | null | undefined) {
  const type = (scriptType || '').toLowerCase();
  switch (type) {
    case 'wordpress':
      return { size: '14.5 MB', tables: 12 };
    case 'joomla':
      return { size: '22.1 MB', tables: 68 };
    case 'drupal':
      return { size: '32.4 MB', tables: 84 };
    case 'laravel':
      return { size: '4.2 MB', tables: 8 };
    case 'ghost':
      return { size: '6.8 MB', tables: 26 };
    case 'prestashop':
      return { size: '48.2 MB', tables: 194 };
    case 'magento':
      return { size: '84.8 MB', tables: 342 };
    default:
      return { size: '0 KB', tables: 0 };
  }
}

export const databaseController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const results: any[] = [];

      // 1. Fetch all site installations and extract their database configurations
      let userSites: any[] = [];
      if (isDbOffline) {
        userSites = inMemoryDb.sites.filter((s) => s.userId === userId);
      } else {
        userSites = await prisma.site.findMany({ where: { userId } });
      }

      for (const site of userSites) {
        if (site.dbName) {
          const metrics = getDatabaseMetrics(site.scriptType);
          results.push({
            id: `site-db-${site.id}`,
            name: site.dbName,
            user: site.dbUser || 'root',
            pass: 'SecurePassword1!', // Standard auto-provisioned password
            size: metrics.size,
            tables: metrics.tables,
            isAssociatedWithSite: true,
          });
        }
      }

      // 2. Fetch custom manually created database instances
      let customDbs: any[] = [];
      if (isDbOffline) {
        customDbs = inMemoryDb.databases.filter((d) => d.userId === userId);
      } else {
        customDbs = await prisma.databaseInstance.findMany({ where: { userId } });
      }

      for (const db of customDbs) {
        results.push({
          id: db.id,
          name: db.name,
          user: db.dbUser,
          pass: db.dbPass,
          size: db.size || '0 KB',
          tables: db.tables || 0,
          isAssociatedWithSite: false,
        });
      }

      res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { name, dbUser, dbPass } = req.body;
      if (!name || !dbUser || !dbPass) {
        res
          .status(400)
          .json({ success: false, error: 'Database name, username and password are required' });
        return;
      }

      // Create database and user on the real MariaDB server
      try {
        await runtimeManager.runMariaDBQuery(`CREATE DATABASE IF NOT EXISTS \`${name}\`;`);
        await runtimeManager.runMariaDBQuery(`CREATE USER IF NOT EXISTS '${dbUser}'@'127.0.0.1' IDENTIFIED BY '${dbPass}';`);
        await runtimeManager.runMariaDBQuery(`GRANT ALL PRIVILEGES ON \`${name}\`.* TO '${dbUser}'@'127.0.0.1';`);
        await runtimeManager.runMariaDBQuery(`FLUSH PRIVILEGES;`);
        logger.info(`Real MariaDB database and user created successfully for: ${name}`);
      } catch (dbErr: any) {
        logger.warn(`Failed creating real MariaDB database/user for ${name}: ${dbErr.message}`);
      }

      if (isDbOffline) {
        // Check uniqueness in-memory
        const exists = inMemoryDb.databases.some((d) => d.name === name);
        if (exists) {
          res.status(400).json({ success: false, error: 'Database name already exists' });
          return;
        }

        const newDb = {
          id: 'db-' + Math.random().toString(36).substr(2, 9),
          userId,
          name,
          dbUser,
          dbPass,
          size: '0 KB',
          tables: 0,
          createdAt: new Date(),
        };
        inMemoryDb.databases.push(newDb);
        saveInMemoryDb();
        res.status(201).json({ success: true, data: newDb });
      } else {
        // Check uniqueness in database
        const exists = await prisma.databaseInstance.findUnique({ where: { name } });
        if (exists) {
          res.status(400).json({ success: false, error: 'Database name already exists' });
          return;
        }

        const newDb = await prisma.databaseInstance.create({
          data: {
            userId,
            name,
            dbUser,
            dbPass,
          },
        });
        res.status(201).json({ success: true, data: newDb });
      }
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      let dbName = '';
      let dbUser = '';

      if (isDbOffline) {
        const db = inMemoryDb.databases.find((d) => d.id === id && d.userId === userId);
        if (db) {
          dbName = db.name;
          dbUser = db.dbUser;
          const index = inMemoryDb.databases.indexOf(db);
          inMemoryDb.databases.splice(index, 1);
          saveInMemoryDb();
        }
      } else {
        // Validate ownership first
        const db = await prisma.databaseInstance.findUnique({ where: { id } });
        if (db && db.userId === userId) {
          dbName = db.name;
          dbUser = db.dbUser;
          await prisma.databaseInstance.delete({ where: { id } });
        }
      }

      // Drop database and user from the real MariaDB server
      if (dbName) {
        try {
          await runtimeManager.runMariaDBQuery(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
          if (dbUser && dbUser !== 'root') {
            await runtimeManager.runMariaDBQuery(`DROP USER IF EXISTS '${dbUser}'@'127.0.0.1';`);
          }
          logger.info(`Real MariaDB database dropped successfully: ${dbName}`);
        } catch (dbErr: any) {
          logger.warn(`Failed dropping real MariaDB database ${dbName}: ${dbErr.message}`);
        }
      }

      res.status(200).json({ success: true, message: 'Database dropped successfully' });
    } catch (err) {
      next(err);
    }
  },
};
