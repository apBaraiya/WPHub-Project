import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb, saveInMemoryDb } from '../repositories/inMemoryDb';
import { logger } from '@wphub/utils';
import { runtimeManager } from './runtimeManager';
import { installerRegistry } from './cmsInstallers';
import { cmsPackageManager } from './cmsPackageManager';

const execPromise = util.promisify(exec);

// Absolute folders definitions
const WORKSPACE_ROOT = path.resolve(process.cwd());
const SITES_DIR = path.join(WORKSPACE_ROOT, 'sites');
const CACHE_DIR = path.join(WORKSPACE_ROOT, 'cache');

// Setup category catalog configuration
export interface InstallConfig {
  siteId: string;
  appName: string; // WordPress, Joomla, Drupal, Laravel, PrestaShop, Magento, Ghost
  appVersion: string;
  protocol: string;
  domain: string;
  directory: string; // relative sub-path e.g. "" or "blog"
  siteName: string;
  siteDescription: string;
  adminUser: string;
  adminPass: string;
  adminEmail: string;
  dbName: string;
  dbPrefix: string;
}



// Progress listener registry (SSE)
const progressMap = new Map<string, (step: string, progress: number) => void>();

export const installerEngine = {
  // Register active progress callback listener
  registerProgressCallback(siteId: string, cb: (step: string, progress: number) => void) {
    progressMap.set(siteId, cb);
  },

  unregisterProgressCallback(siteId: string) {
    progressMap.delete(siteId);
  },

  async runInstallation(userId: string, cfg: InstallConfig) {
    const { siteId, appName, appVersion, directory } = cfg;

    const notify = (step: string, progress: number) => {
      const cb = progressMap.get(siteId);
      if (cb) cb(step, progress);
    };

    // 1. Resolve Installer Module
    const installer = installerRegistry.get(appName);
    const sitePath = path.join(SITES_DIR, siteId);
    
    // Resolve webRoot dynamically relative to the custom documentRoot
    const webRoot = installer.documentRoot 
      ? (directory 
        ? path.join(sitePath, installer.documentRoot, directory) 
        : path.join(sitePath, installer.documentRoot))
      : (directory 
        ? path.join(sitePath, directory) 
        : sitePath);

    const dbName = cfg.dbName || `${appName.toLowerCase()}_db`;
    const dbUser = `${appName.toLowerCase()}_user`;
    const dbPass = 'SecurePassword1!';

    try {
      notify('Preparing...', 10);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Create base directories
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
      await fs.promises.mkdir(webRoot, { recursive: true });

      notify('Downloading...', 30);
      const pkg = await cmsPackageManager.acquirePackage(appName, {
        version: appVersion,
        maxRetries: 3,
        resumeIfPartial: true,
      });

      // 3. Extract files
      notify('Extracting...', 55);
      try {
        const tempExtract = path.join(sitePath, `temp_extract_${Date.now()}`);
        await fs.promises.mkdir(tempExtract, { recursive: true });

        const command =
          process.platform === 'win32'
            ? `powershell -Command "Expand-Archive -Path '${pkg.localPath}' -DestinationPath '${tempExtract}' -Force"`
            : `unzip -o "${pkg.localPath}" -d "${tempExtract}"`;

        await execPromise(command);

        // Copy files recursively
        const contentItems = await fs.promises.readdir(tempExtract);
        if (
          contentItems.length === 1 &&
          fs.statSync(path.join(tempExtract, contentItems[0])).isDirectory()
        ) {
          const nestedDir = path.join(tempExtract, contentItems[0]);
          await fs.promises.cp(nestedDir, webRoot, { recursive: true, force: true });
        } else {
          await fs.promises.cp(tempExtract, webRoot, { recursive: true, force: true });
        }

        // Cleanup temp folder
        await fs.promises.rm(tempExtract, { recursive: true, force: true });
      } catch (extractErr: any) {
        logger.error(`Native extraction failed: ${extractErr.message}`);
        throw new Error(`Extraction failed: ${extractErr.message}`);
      }

      // 4. Run Pre-Install Hook
      await installer.preInstall(siteId, sitePath, webRoot, cfg);

      // 5. Create real Database and User on MariaDB
      notify('Creating Database...', 75);
      try {
        await runtimeManager.runMariaDBQuery(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await runtimeManager.runMariaDBQuery(`CREATE USER IF NOT EXISTS '${dbUser}'@'127.0.0.1' IDENTIFIED BY '${dbPass}';`);
        await runtimeManager.runMariaDBQuery(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'127.0.0.1';`);
        await runtimeManager.runMariaDBQuery(`FLUSH PRIVILEGES;`);
        logger.info(`Real MariaDB database and user created for site installation: ${dbName}`);
      } catch (dbErr: any) {
        logger.error(`Failed creating real database for installation: ${dbErr.message}`);
        throw new Error(`Database provisioning failed: ${dbErr.message}`);
      }

      // 6. Generate configuration files
      notify('Writing Config...', 85);
      const dbConfig = {
        dbName,
        dbUser,
        dbPass,
        dbHost: '127.0.0.1',
        dbPort: 3306,
        dbPrefix: cfg.dbPrefix
      };
      await installer.configure(webRoot, cfg, dbConfig);

      notify('Finalizing...', 95);

      // 7. Start PHP server pointing to webRoot (the custom documentRoot)
      let sitePort = 8080;
      if (runtimeManager.isReady()) {
        sitePort = await runtimeManager.startPhpServer(siteId, webRoot);
        
        // Execute dynamic installation trigger
        try {
          await installer.install(webRoot, cfg);
          
          // Verify site installation and credentials login
          const verified = await installer.verify(sitePort, webRoot, cfg);
          if (!verified) {
            throw new Error('Installation verification or login check failed.');
          }
          logger.info('CMS installation and authentication verified successfully.');
        } catch (setupErr: any) {
          logger.error(`Installation verification failed: ${setupErr.message}. Triggering rollback...`);
          
          // Stop loopback PHP server first to release file lock descriptors on Windows
          try {
            runtimeManager.stopPhpServer(siteId);
          } catch (e: any) {
            logger.warn(`Failed stopping PHP server during rollback: ${e.message}`);
          }

          // Run installer-specific cleanup
          await installer.cleanup(webRoot, cfg).catch(() => {});

          // Rollback database, user and files
          try {
            await runtimeManager.runMariaDBQuery(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
            if (dbUser !== 'root') {
              await runtimeManager.runMariaDBQuery(`DROP USER IF EXISTS '${dbUser}'@'127.0.0.1';`);
            }
          } catch (e: any) {
            logger.warn(`Failed database drop during rollback: ${e.message}`);
          }
          try {
            await fs.promises.rm(sitePath, { recursive: true, force: true });
          } catch (e: any) {
            logger.warn(`Failed directory removal during rollback: ${e.message}`);
          }
          
          throw new Error(`CMS automatic setup failed: ${setupErr.message}`);
        }
      }

      // 8. Update database record and status
      if (isDbOffline) {
        const s = inMemoryDb.sites.find((s) => s.id === siteId);
        if (s) {
          s.status = 'ACTIVE';
          s.scriptType = appName;
          s.scriptVersion = appVersion;
          s.dbName = dbName;
          s.dbUser = dbUser;
          s.dbPrefix = cfg.dbPrefix;
        }

        // Add history log entry
        inMemoryDb.installHistories.push({
          id: 'hist-' + Math.random().toString(36).substr(2, 9),
          userId,
          siteId,
          appName,
          appVersion,
          domain: cfg.domain,
          status: 'COMPLETED',
          createdAt: new Date(),
        });
        saveInMemoryDb();
      } else {
        await prisma.site.update({
          where: { id: siteId },
          data: {
            status: 'ACTIVE',
            scriptType: appName,
            scriptVersion: appVersion,
            dbName: dbName,
            dbUser: dbUser,
            dbPrefix: cfg.dbPrefix,
          },
        });

        await prisma.installHistory.create({
          data: {
            userId,
            siteId,
            appName,
            appVersion,
            domain: cfg.domain,
            status: 'COMPLETED',
          },
        });
      }

      notify('Completed', 100);
      logger.info(`Script installed successfully: ${appName} on site: ${siteId}`);
    } catch (error: any) {
      logger.error(`Error during Script Installation: ${error.message}`);
      notify('Failed', 0);
    }
  },
};
