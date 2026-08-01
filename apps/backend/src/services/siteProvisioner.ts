import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '@wphub/utils';
import { runtimeManager } from './runtimeManager';
import { siteResolver } from './siteResolver';

const WORKSPACE_ROOT = path.resolve(process.cwd());
const SITES_DIR = path.join(WORKSPACE_ROOT, 'sites');

export interface ProvisionResult {
  sitePath: string;
  webRoot: string;
  dbName: string;
  dbUser: string;
  dbPass: string;
  port: number;
  sslPath: string;
  phpIniPath: string;
}

export interface CMSInstallerConfig {
  documentRoot: string;
  directory?: string;
}

export const siteProvisioner = {
  async provision(siteId: string, _domain: string, installerConfig: CMSInstallerConfig): Promise<ProvisionResult> {
    const sitePath = path.join(SITES_DIR, siteId);
    
    // Create base isolated directories
    const pathsToCreate = [
      sitePath,
      path.join(sitePath, 'bin'),
      path.join(sitePath, 'backups'),
      path.join(sitePath, 'cache'),
      path.join(sitePath, 'config'),
      path.join(sitePath, 'config', 'ssl'),
      path.join(sitePath, 'logs'),
      path.join(sitePath, 'tmp'),
    ];

    for (const p of pathsToCreate) {
      await fs.promises.mkdir(p, { recursive: true });
    }

    // Resolve webRoot based on dynamic document root configuration
    const resolvedLoc = siteResolver.resolveSiteLocation(siteId, '', installerConfig.directory);
    let webRoot = installerConfig.documentRoot 
      ? path.join(sitePath, installerConfig.documentRoot)
      : resolvedLoc.webRoot;
    if (installerConfig.directory && !webRoot.endsWith(installerConfig.directory)) {
      webRoot = path.join(webRoot, installerConfig.directory);
    }
    await fs.promises.mkdir(webRoot, { recursive: true });

    // 1. Create site-specific php.ini for strict execution limits
    const phpIniPath = path.join(sitePath, 'config', 'php.ini');
    const tmpDir = path.join(sitePath, 'tmp');
    const errorLogPath = path.join(sitePath, 'logs', 'error.log');
    
    const localExtDir = path.join(process.cwd(), 'runtimes', 'php', 'ext').replace(/\\/g, '/');
    const extDirSetting = fs.existsSync(localExtDir) ? `extension_dir = "${localExtDir}"` : `extension_dir = "ext"`;

    const phpIniContent = `; Site-specific isolated php.ini configuration
[PHP]
${extDirSetting}
extension=mysqli
extension=pdo_mysql
extension=curl
extension=mbstring
extension=openssl
extension=fileinfo
extension=gd
extension=zip

upload_tmp_dir = "${tmpDir.replace(/\\/g, '/')}"
session.save_path = "${tmpDir.replace(/\\/g, '/')}"
error_log = "${errorLogPath.replace(/\\/g, '/')}"
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 64M
display_errors = On
log_errors = On
`;
    await fs.promises.writeFile(phpIniPath, phpIniContent, 'utf8');

    // 2. Setup database credentials
    const cleanId = siteId.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const dbName = `site_${cleanId}`;
    const dbUser = `user_${cleanId}`.substring(0, 16); // DB usernames limited to 16 chars
    const dbPass = `Pass_${crypto.randomBytes(6).toString('hex')}!`;

    // 3. Provision DB on MariaDB
    try {
      await runtimeManager.ensureMariaDBRuntime();
      await runtimeManager.runMariaDBQuery(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await runtimeManager.runMariaDBQuery(`CREATE USER IF NOT EXISTS '${dbUser}'@'127.0.0.1' IDENTIFIED BY '${dbPass}';`);
      await runtimeManager.runMariaDBQuery(`CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY '${dbPass}';`);
      await runtimeManager.runMariaDBQuery(`CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPass}';`);
      await runtimeManager.runMariaDBQuery(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'127.0.0.1';`);
      await runtimeManager.runMariaDBQuery(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'localhost';`);
      await runtimeManager.runMariaDBQuery(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';`);
      await runtimeManager.runMariaDBQuery(`FLUSH PRIVILEGES;`);
      logger.info(`Provisioned isolated database "${dbName}" and user "${dbUser}" for site "${siteId}"`);
    } catch (err: any) {
      logger.error(`Database provisioning failed: ${err.message}`);
      throw new Error(`Failed to provision isolated database: ${err.message}`);
    }

    // 4. Reserve next available loopback port via runtimeManager
    let port = 8080;
    if (runtimeManager.isReady()) {
      port = await runtimeManager.startPhpServer(siteId, webRoot);
    }

    const sslPath = path.join(sitePath, 'config', 'ssl');

    return {
      sitePath,
      webRoot,
      dbName,
      dbUser,
      dbPass,
      port,
      sslPath,
      phpIniPath,
    };
  },

  async deprovision(siteId: string, dbName: string, dbUser: string): Promise<void> {
    const sitePath = path.join(SITES_DIR, siteId);
    
    // Stop PHP server process
    try {
      runtimeManager.stopPhpServer(siteId);
    } catch (e: any) {
      logger.warn(`Failed to stop PHP server during deprovision: ${e.message}`);
    }

    // Drop MariaDB database & user
    try {
      await runtimeManager.runMariaDBQuery(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
      if (dbUser && dbUser !== 'root') {
        await runtimeManager.runMariaDBQuery(`DROP USER IF EXISTS '${dbUser}'@'127.0.0.1';`);
      }
      logger.info(`Deprovisioned database "${dbName}" and user "${dbUser}"`);
    } catch (err: any) {
      logger.warn(`Failed to drop database or user during deprovision: ${err.message}`);
    }

    // Remove file path structure
    try {
      await fs.promises.rm(sitePath, { recursive: true, force: true });
      logger.info(`Deprovisioned site directory layout: ${sitePath}`);
    } catch (err: any) {
      logger.warn(`Failed to remove site directory layout: ${err.message}`);
    }
  }
};
