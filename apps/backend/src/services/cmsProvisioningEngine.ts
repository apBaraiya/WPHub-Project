import fs from 'fs';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';
import http from 'http';
import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb, saveInMemoryDb } from '../repositories/inMemoryDb';
import { logger } from '@wphub/utils';
import { cmsPluginLoader, InstallContext } from '../installers/pluginLoader';
import { siteProvisioner } from './siteProvisioner';
import { cmsPackageManager } from './cmsPackageManager';
import { runtimeManager } from './runtimeManager';
import { siteResolver } from './siteResolver';
import { webServerEngine } from './webServerEngine';
import { InstallConfig } from './installerEngine';

const execPromise = util.promisify(exec);

export type ProvisioningStatus =
  | 'PENDING'
  | 'PROVISIONING'
  | 'DOWNLOADING'
  | 'CONFIGURING'
  | 'STARTING'
  | 'HEALTH_CHECKING'
  | 'READY'
  | 'FAILED'
  | 'STOPPED'
  | 'REMOVING';

export interface ProvisioningState {
  siteId: string;
  step: string;
  progress: number;
  status: ProvisioningStatus;
  error?: string;
}

const progressListeners = new Map<string, (state: ProvisioningState) => void>();

export const cmsProvisioningEngine = {
  registerListener(siteId: string, callback: (state: ProvisioningState) => void) {
    progressListeners.set(siteId, callback);
  },

  unregisterListener(siteId: string) {
    progressListeners.delete(siteId);
  },

  async updateStatus(siteId: string, status: ProvisioningStatus, step: string, progress: number, error?: string) {
    const state: ProvisioningState = { siteId, step, progress, status, error };
    
    // 1. Notify SSE listeners
    const cb = progressListeners.get(siteId);
    if (cb) cb(state);

    // 2. Persist to DB or Memory
    try {
      if (isDbOffline) {
        const site = inMemoryDb.sites.find((s) => s.id === siteId);
        if (site) {
          site.status = status;
          saveInMemoryDb();
        }
      } else {
        await prisma.site.update({
          where: { id: siteId },
          data: { status },
        });
      }
    } catch (e: any) {
      logger.error(`Failed to update site status in DB for ${siteId}: ${e.message}`);
    }
  },

  /**
   * Universal 12-Step Provisioning Pipeline
   */
  async provisionSite(_userId: string, cfg: InstallConfig) {
    const { siteId, appName, appVersion, domain, directory } = cfg;
    const cmsModule = cmsPluginLoader.getModule(appName);
    const manifest = cmsModule.manifest;

    logger.info(`Starting Universal Provisioning Pipeline for site [${siteId}] CMS: [${manifest.displayName}]`);

    let provisioned: any = null;

    try {
      // STEP 1: CREATE_SITE (PENDING)
      await this.updateStatus(siteId, 'PENDING', 'CREATE_SITE', 5);

      // STEP 2: CREATE_DATABASE (PROVISIONING)
      await this.updateStatus(siteId, 'PROVISIONING', 'CREATE_DATABASE', 15);
      provisioned = await siteProvisioner.provision(siteId, domain, {
        documentRoot: manifest.documentRoot,
        directory,
      });

      const { sitePath, webRoot, dbName, dbUser, dbPass, port } = provisioned;
      cfg.dbName = dbName;
      cfg.dbUser = dbUser;

      const dbConfig = {
        dbName,
        dbUser,
        dbPass,
        dbHost: '127.0.0.1',
        dbPort: 3306,
        dbPrefix: cfg.dbPrefix || 'wp_',
      };

      const ctx: InstallContext = {
        siteId,
        domain,
        sitePath,
        webRoot,
        dbConfig,
        config: cfg,
      };

      // STEP 3: CREATE_NETWORK
      await this.updateStatus(siteId, 'PROVISIONING', 'CREATE_NETWORK', 25);

      // STEP 4: CREATE_VOLUMES
      await this.updateStatus(siteId, 'PROVISIONING', 'CREATE_VOLUMES', 35);
      const volumes = ['uploads', 'config', 'logs'];
      for (const vol of volumes) {
        await fs.promises.mkdir(path.join(sitePath, vol), { recursive: true });
      }

      // STEP 5: DOWNLOAD_APPLICATION (DOWNLOADING)
      await this.updateStatus(siteId, 'DOWNLOADING', 'DOWNLOAD_APPLICATION', 45);
      const pkgUrl = manifest.defaultPackageUrl;
      const pkg = await cmsPackageManager.acquirePackage(appName, {
        version: appVersion,
        packageUrl: pkgUrl,
        maxRetries: 3,
        resumeIfPartial: true,
      });

      // STEP 6: EXTRACT_APPLICATION (CONFIGURING)
      await this.updateStatus(siteId, 'CONFIGURING', 'EXTRACT_APPLICATION', 60);
      const tempExtract = path.join(sitePath, `temp_extract_${Date.now()}`);
      await fs.promises.mkdir(tempExtract, { recursive: true });

      const command =
        process.platform === 'win32'
          ? `powershell -Command "Expand-Archive -Path '${pkg.localPath}' -DestinationPath '${tempExtract}' -Force"`
          : `unzip -o "${pkg.localPath}" -d "${tempExtract}"`;

      await execPromise(command);

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

      await fs.promises.rm(tempExtract, { recursive: true, force: true });

      // Run preInstall plugin hook if present
      if (cmsModule.preInstall) {
        await cmsModule.preInstall(ctx);
      }

      // STEP 7: GENERATE_CONFIGURATION
      await this.updateStatus(siteId, 'CONFIGURING', 'GENERATE_CONFIGURATION', 70);
      if (cmsModule.generateConfig) {
        await cmsModule.generateConfig(ctx);
      }

      // STEP 8: CONFIGURE_ENVIRONMENT
      await this.updateStatus(siteId, 'CONFIGURING', 'CONFIGURE_ENVIRONMENT', 75);
      if (cmsModule.executeInstall) {
        await cmsModule.executeInstall(ctx);
      }

      // STEP 9: GENERATE_RUNTIME (STARTING)
      await this.updateStatus(siteId, 'STARTING', 'GENERATE_RUNTIME', 80);
      siteResolver.registerSite(siteId, {
        siteId,
        domain,
        scriptType: appName,
        webRoot,
        sitePath,
        documentRoot: manifest.documentRoot,
      });

      // STEP 10: GENERATE_ROUTING
      await this.updateStatus(siteId, 'STARTING', 'GENERATE_ROUTING', 85);
      const vhostConfig = await webServerEngine.generateConfig('nginx', domain, sitePath, port);
      await fs.promises.mkdir(path.join(sitePath, 'config'), { recursive: true });
      await fs.promises.writeFile(path.join(sitePath, 'config', 'vhost.conf'), vhostConfig, 'utf8');

      // STEP 11: START_SERVICES
      await this.updateStatus(siteId, 'STARTING', 'START_SERVICES', 90);
      const activePort = await runtimeManager.startPhpServer(siteId, webRoot);

      // STEP 12: HEALTH_CHECK & MARK_INSTALLATION_READY
      await this.updateStatus(siteId, 'HEALTH_CHECKING', 'HEALTH_CHECK', 95);
      const healthy = await this.performHealthCheck(activePort || port, manifest.healthCheckPath || '/');

      if (!healthy) {
        throw new Error(`Health check failed for ${appName} on port ${activePort || port}`);
      }

      if (cmsModule.verifyInstall) {
        const moduleVerified = await cmsModule.verifyInstall(ctx);
        if (!moduleVerified) {
          throw new Error(`Module verification failed for ${appName}`);
        }
      }

      await this.updateStatus(siteId, 'READY', 'MARK_INSTALLATION_READY', 98);
      await this.updateStatus(siteId, 'READY', 'Completed', 100);
      logger.info(`Universal Provisioning Pipeline successfully completed for [${siteId}] -> ${domain}`);
    } catch (err: any) {
      logger.error(`Provisioning pipeline failed for [${siteId}]: ${err.message}`);
      await this.updateStatus(siteId, 'FAILED', 'FAILED', 0, err.message);

      // Trigger cleanup / rollback
      if (cmsModule.onRollback && provisioned) {
        try {
          await cmsModule.onRollback(provisioned, err);
        } catch (rErr: any) {
          logger.error(`Rollback hook error: ${rErr.message}`);
        }
      }
      await this.rollbackPartialInstallation(siteId);
    }
  },

  /**
   * Perform HTTP health check against local loopback runtime port
   */
  async performHealthCheck(port: number, healthPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 5;

      const check = () => {
        attempts++;
        const req = http.get(`http://127.0.0.1:${port}${healthPath}`, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve(true);
          } else if (attempts < maxAttempts) {
            setTimeout(check, 1000);
          } else {
            resolve(false);
          }
        });

        req.on('error', () => {
          if (attempts < maxAttempts) {
            setTimeout(check, 1000);
          } else {
            resolve(false);
          }
        });

        req.end();
      };

      check();
    });
  },

  /**
   * Rollback partial installation resources safely
   */
  async rollbackPartialInstallation(siteId: string) {
    try {
      logger.info(`Rolling back partial installation resources for site [${siteId}]...`);
      // 1. Stop PHP server
      await runtimeManager.stopPhpServer(siteId);

      // 2. Unregister site resolver
      siteResolver.unregisterSite(siteId);
    } catch (err: any) {
      logger.error(`Rollback cleanup failed for [${siteId}]: ${err.message}`);
    }
  },

  /**
   * Uninstall a site cleanly
   */
  async uninstallSite(siteId: string, removeDb = true) {
    logger.info(`Uninstalling site [${siteId}] (removeDb: ${removeDb})...`);
    await this.updateStatus(siteId, 'REMOVING', 'UNINSTALLING', 10);

    try {
      // 1. Stop loopback server
      await runtimeManager.stopPhpServer(siteId);

      // 2. Unregister site
      const siteMeta = siteResolver.getSite(siteId);
      siteResolver.unregisterSite(siteId);

      // 3. Remove filesystem if sitePath exists
      if (siteMeta?.sitePath && fs.existsSync(siteMeta.sitePath)) {
        await fs.promises.rm(siteMeta.sitePath, { recursive: true, force: true });
      }

      // 4. Remove database if requested
      if (removeDb) {
        const dbName = `site_${siteId.replace(/[^a-zA-Z0-9_]/g, '_')}_db`;
        const rootUser = process.env.DB_USER || 'root';
        const rootPass = process.env.DB_PASS || 'root';
        const dropCmd = `mysql -u${rootUser} -p${rootPass} -e "DROP DATABASE IF EXISTS \`${dbName}\`;"`;
        await execPromise(dropCmd).catch((err) =>
          logger.warn(`Could not drop database ${dbName}: ${err.message}`),
        );
      }

      // 5. Delete from database
      if (isDbOffline) {
        const idx = inMemoryDb.sites.findIndex((s) => s.id === siteId);
        if (idx !== -1) {
          inMemoryDb.sites.splice(idx, 1);
          saveInMemoryDb();
        }
      } else {
        await prisma.site.delete({ where: { id: siteId } }).catch(() => null);
      }

      logger.info(`Site [${siteId}] successfully uninstalled.`);
    } catch (err: any) {
      logger.error(`Uninstall failed for site [${siteId}]: ${err.message}`);
      throw err;
    }
  },

  /**
   * Reinstall a site cleanly
   */
  async reinstallSite(userId: string, siteId: string, cfg: InstallConfig) {
    logger.info(`Reinstalling site [${siteId}]...`);
    // Clean up current installation first
    await this.rollbackPartialInstallation(siteId);

    // Re-run provisioning pipeline
    await this.provisionSite(userId, cfg);
  },
};
