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
import { siteProvisioner } from './siteProvisioner';
import { cmsVerificationEngine } from './cmsVerificationEngine';

const execPromise = util.promisify(exec);

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

    // Call siteProvisioner to provision database, directory tree, php.ini, ports
    let provisioned;
    try {
      notify('Preparing...', 10);
      provisioned = await siteProvisioner.provision(siteId, cfg.domain, {
        documentRoot: installer.documentRoot,
        directory,
      });
    } catch (provisionErr: any) {
      logger.error(`Site provisioning failed: ${provisionErr.message}`);
      notify('Failed', 0);
      return;
    }

    const { sitePath, webRoot, dbName, dbUser, dbPass, port } = provisioned;

    try {
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

      // 5. Generate configuration files
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

      // 6. Start PHP server and trigger CMS-specific installer logic
      const sitePort = port;
      if (runtimeManager.isReady()) {
        try {
          await installer.install(webRoot, cfg);
          
          // Verify site installation using 12-point verification suite
          const verified = await installer.verify(sitePort, webRoot, cfg);
          if (!verified) {
            throw new Error('Installation module verification check failed.');
          }

          const report = await cmsVerificationEngine.verifyWithRetryAndRollback(
            siteId,
            appName,
            webRoot,
            sitePort,
            dbName,
            dbUser,
            cfg.adminUser,
            cfg.adminPass,
            { maxRetries: 3, autoRollbackOnFailure: true }
          );

          if (!report.overallPassed) {
            throw new Error(`12-point health check suite failed (${report.failedChecks} checks failed).`);
          }
          logger.info('CMS 12-point verification suite passed successfully.');
        } catch (setupErr: any) {
          logger.error(`Installation verification failed: ${setupErr.message}. Triggering deprovisioning rollback...`);
          
          if (installer.onRollback) {
            await installer.onRollback(webRoot, cfg, setupErr).catch((e) => {
              logger.error(`Module rollback failed: ${e.message}`);
            });
          }
          await installer.cleanup(webRoot, cfg).catch(() => {});

          await siteProvisioner.deprovision(siteId, dbName, dbUser).catch((e) => {
            logger.error(`Deprovisioning failed during rollback: ${e.message}`);
          });

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
      notify(`Failed: ${error.message}`, 0);
    }
  },
};
