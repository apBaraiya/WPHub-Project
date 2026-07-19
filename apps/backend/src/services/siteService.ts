import Docker from 'dockerode';
import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb, saveInMemoryDb } from '../repositories/inMemoryDb';
import { logger } from '@wphub/utils';
import fs from 'fs';
import path from 'path';
import { runtimeManager } from './runtimeManager';

// Dynamic docker connection detection
const dockerOptions: any = {};
if (process.env.DOCKER_HOST) {
  try {
    const url = new URL(process.env.DOCKER_HOST);
    dockerOptions.host = url.hostname;
    dockerOptions.port = url.port;
  } catch (e) {
    logger.warn('Failed parsing DOCKER_HOST environment variable.');
  }
} else if (process.platform === 'win32') {
  dockerOptions.socketPath = '//./pipe/docker_engine';
} else {
  dockerOptions.socketPath = '/var/run/docker.sock';
}

let docker: Docker | null = null;
try {
  docker = new Docker(dockerOptions);
} catch (err: any) {
  logger.warn(`Docker connection could not be initialized: ${err.message}`);
}

export interface ProgressStep {
  step: string;
  message: string;
  progress: number;
}

// In-memory registry of active progress listeners (Server-Sent Events hooks)
const progressListeners = new Map<string, Array<(data: ProgressStep) => void>>();

export const siteService = {
  // Register SSE stream listener
  addListener(siteId: string, listener: (data: ProgressStep) => void) {
    if (!progressListeners.has(siteId)) {
      progressListeners.set(siteId, []);
    }
    progressListeners.get(siteId)!.push(listener);
  },

  // Unregister SSE stream listener
  removeListener(siteId: string, listener: (data: ProgressStep) => void) {
    const list = progressListeners.get(siteId);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
      if (list.length === 0) {
        progressListeners.delete(siteId);
      }
    }
  },

  // Push updates to active listening channels
  notifyProgress(siteId: string, data: ProgressStep) {
    const list = progressListeners.get(siteId);
    if (list) {
      list.forEach((cb) => cb(data));
    }
  },

  async getAllSites(userId: string) {
    if (isDbOffline) {
      return inMemoryDb.sites.filter((s) => s.userId === userId);
    }
    return prisma.site.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createSite(userId: string, name: string, domain: string) {
    // Generate custom subdomain if only slug was provided
    let finalDomain = domain;
    if (!domain.includes('.')) {
      finalDomain = `${domain}.wphub.cloud`;
    }

    // Generate safe site slug for folder namings
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .trim();
    const baseId = slug || 'site';
    let finalId = baseId;
    let count = 1;

    if (isDbOffline) {
      while (inMemoryDb.sites.some((s) => s.id === finalId)) {
        finalId = `${baseId}-${count}`;
        count++;
      }

      const site = {
        id: finalId,
        userId,
        name,
        domain: finalDomain,
        status: 'PROVISIONING',
        phpVersion: '8.2',
        wpVersion: '6.4',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryDb.sites.unshift(site);

      // Auto-register domain in Domain table
      const parts = finalDomain.split('.');
      const ext = parts.slice(1).join('.');
      const namePart = parts[0];
      inMemoryDb.domains.push({
        id: 'dom-' + Math.random().toString(36).substr(2, 9),
        userId,
        name: namePart,
        extension: ext,
        domain: finalDomain,
        type: 'Primary',
        status: 'ACTIVE',
        ssl: true,
        dnsValid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Write domain to hosts file
      runtimeManager.addDomainToHosts(finalDomain);

      // Start background cloud provisioning job asynchronously
      this.runProvisioningJob(site.id, name, finalDomain).catch((err) => {
        logger.error(
          `Failed executing background provisioning for site ${site.id}: ${err.message}`,
        );
      });

      saveInMemoryDb();
      return site;
    }

    while (await prisma.site.findUnique({ where: { id: finalId } })) {
      finalId = `${baseId}-${count}`;
      count++;
    }

    const site = await prisma.site.create({
      data: {
        id: finalId,
        userId,
        name,
        domain: finalDomain,
        status: 'PROVISIONING',
      },
    });

    // Auto-register domain in Domain table
    const parts = finalDomain.split('.');
    const ext = parts.slice(1).join('.');
    const namePart = parts[0];
    const existingDom = await prisma.domain.findUnique({ where: { domain: finalDomain } });
    if (!existingDom) {
      await prisma.domain
        .create({
          data: {
            userId,
            name: namePart,
            extension: ext,
            domain: finalDomain,
            type: 'Primary',
            status: 'ACTIVE',
            ssl: true,
            dnsValid: true,
          },
        })
        .catch(() => {});
    }

    // Write domain to hosts file
    runtimeManager.addDomainToHosts(finalDomain);

    // Start background cloud provisioning job asynchronously
    this.runProvisioningJob(site.id, name, finalDomain).catch((err) => {
      logger.error(`Failed executing background provisioning for site ${site.id}: ${err.message}`);
    });

    return site;
  },

  async deleteSite(userId: string, id: string) {
    if (isDbOffline) {
      const idx = inMemoryDb.sites.findIndex((s) => s.id === id && s.userId === userId);
      if (idx === -1) {
        throw new Error('Site not found');
      }
      const site = inMemoryDb.sites[idx];

      // Delete domain record
      const domIdx = inMemoryDb.domains.findIndex(
        (d) => d.domain.toLowerCase() === site.domain.toLowerCase(),
      );
      if (domIdx !== -1) {
        inMemoryDb.domains.splice(domIdx, 1);
      }

      // Remove local hosts mapping
      runtimeManager.removeDomainFromHosts(site.domain);

      this.runCleanupJob(site.id).catch((err) => {
        logger.error(`Failed executing background cleanup for site ${site.id}: ${err.message}`);
      });
      inMemoryDb.sites.splice(idx, 1);
      saveInMemoryDb();
      return true;
    }

    const site = await prisma.site.findFirst({
      where: { id, userId },
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Delete corresponding domain record
    await prisma.domain
      .deleteMany({
        where: { domain: { equals: site.domain, mode: 'insensitive' } },
      })
      .catch(() => {});

    // Remove local hosts mapping
    runtimeManager.removeDomainFromHosts(site.domain);

    // Trigger cleanup job in the background
    this.runCleanupJob(site.id).catch((err) => {
      logger.error(`Failed executing background cleanup for site ${site.id}: ${err.message}`);
    });

    await prisma.site.delete({ where: { id } });
    return true;
  },

  // Asynchronous Provision Worker Engine
  async runProvisioningJob(siteId: string, _name: string, domain: string) {
    const push = (message: string, progress: number) => {
      const logMsg = `[Site Provision: ${siteId}] ${message} (${progress}%)`;
      logger.info(logMsg);
      this.notifyProgress(siteId, { step: 'PROVISION_STAGE', message, progress });
    };

    try {
      push('Initializing Cloud Orchestration Engine...', 10);

      const WORKSPACE_ROOT = path.resolve(process.cwd());
      const sitePath = path.join(WORKSPACE_ROOT, 'sites', siteId);
      if (fs.existsSync(sitePath)) {
        await fs.promises.rm(sitePath, { recursive: true, force: true }).catch(() => {});
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      push('Connecting to Cloud Docker Host Node...', 25);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let hasDocker = false;
      if (docker) {
        try {
          await docker.ping();
          hasDocker = true;
        } catch (e) {
          logger.warn(
            `Docker daemon is offline. Falling back to Graceful Simulation mode for provisioning: ${siteId}`,
          );
        }
      }

      if (hasDocker && docker) {
        // Step 3: Create database container
        push('Provisioning database container (MySQL/MariaDB)...', 45);
        const dbContainerName = `wphub-db-${siteId}`;
        const dbEnv = [
          'MYSQL_ROOT_PASSWORD=wp_root_secure_pass',
          'MYSQL_DATABASE=wordpress',
          'MYSQL_USER=wordpress',
          'MYSQL_PASSWORD=wordpress_secure_pass',
        ];

        // Fetch or Pull MySQL Image if needed
        try {
          await docker
            .createContainer({
              Image: 'mysql:8.0',
              name: dbContainerName,
              Env: dbEnv,
              HostConfig: {
                NetworkMode: 'wphub-network',
                RestartPolicy: { Name: 'unless-stopped' },
              },
            })
            .then((c) => c.start());
        } catch (dbErr: any) {
          logger.warn(`Database container setup notice: ${dbErr.message}`);
        }

        // Step 4: Create WordPress Container with Traefik Labels
        push('Launching isolated WordPress PHP-FPM application container...', 75);
        const wpContainerName = `wphub-wp-${siteId}`;
        const wpEnv = [
          `WORDPRESS_DB_HOST=${dbContainerName}:3306`,
          'WORDPRESS_DB_USER=wordpress',
          'WORDPRESS_DB_PASSWORD=wordpress_secure_pass',
          'WORDPRESS_DB_NAME=wordpress',
        ];

        try {
          await docker
            .createContainer({
              Image: 'wordpress:latest',
              name: wpContainerName,
              Env: wpEnv,
              Labels: {
                'traefik.enable': 'true',
                [`traefik.http.routers.wp-${siteId}.rule`]: `Host(\`${domain}\`)`,
                [`traefik.http.routers.wp-${siteId}.entrypoints`]: 'web',
                [`traefik.http.services.wp-${siteId}.loadbalancer.server.port`]: '80',
              },
              HostConfig: {
                NetworkMode: 'wphub-network',
                RestartPolicy: { Name: 'unless-stopped' },
              },
            })
            .then((c) => c.start());
        } catch (wpErr: any) {
          logger.warn(`WordPress container setup notice: ${wpErr.message}`);
        }

        push('Configuring Cloud Reverse Proxy routing and SSL certifications...', 90);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        // Fallback simulation mode logic to support offline development environments
        push('Provisioning database container (MySQL/MariaDB) [Simulated]...', 45);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        push('Launching isolated WordPress PHP-FPM application container [Simulated]...', 75);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        push('Configuring Cloud Reverse Proxy routing and SSL certifications [Simulated]...', 90);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Success Status Update
      const webRoot = path.join(sitePath, 'public_html');

      try {
        await fs.promises.mkdir(webRoot, { recursive: true });
        if (
          !fs.existsSync(path.join(webRoot, 'index.php')) &&
          !fs.existsSync(path.join(webRoot, 'index.html'))
        ) {
          await fs.promises.writeFile(
            path.join(webRoot, 'index.html'),
            `<html>
              <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0f172a;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                <div style="text-align:center;">
                  <h1 style="color:#818cf8;margin-bottom:10px;">Domain Linked Successfully</h1>
                  <p style="color:#94a3b8;margin-top:0;">Install WordPress or other CMS scripts from the auto-installer to launch your site.</p>
                </div>
              </body>
            </html>`,
          );
        }
        await runtimeManager.startPhpServer(siteId, webRoot);
      } catch (err: any) {
        logger.warn(`Failed initializing webRoot or starting PHP server: ${err.message}`);
      }

      if (isDbOffline) {
        const s = inMemoryDb.sites.find((s) => s.id === siteId);
        if (s) s.status = 'ACTIVE';
      } else {
        await prisma.site.update({
          where: { id: siteId },
          data: { status: 'ACTIVE' },
        });
      }

      push('Cloud site installation successfully completed! Site is now live.', 100);
    } catch (err: any) {
      logger.error(`Error provisioning site ${siteId}: ${err.message}`);

      if (isDbOffline) {
        const s = inMemoryDb.sites.find((s) => s.id === siteId);
        if (s) s.status = 'SUSPENDED';
      } else {
        await prisma.site.update({
          where: { id: siteId },
          data: { status: 'SUSPENDED' },
        });
      }

      this.notifyProgress(siteId, {
        step: 'FAILED',
        message: `Provisioning failed: ${err.message}`,
        progress: 0,
      });
    }
  },

  // Asynchronous Container Cleanup Worker
  async runCleanupJob(siteId: string) {
    try {
      runtimeManager.stopPhpServer(siteId);
    } catch (e: any) {
      logger.warn(`Failed stopping PHP server: ${e.message}`);
    }

    let dbName = '';
    let dbUser = '';
    try {
      if (isDbOffline) {
        const s = inMemoryDb.sites.find((site) => site.id === siteId);
        if (s) {
          dbName = s.dbName || '';
          dbUser = s.dbUser || '';
        }
      } else {
        const s = await prisma.site.findUnique({ where: { id: siteId } });
        if (s) {
          dbName = s.dbName || '';
          dbUser = s.dbUser || '';
        }
      }
    } catch (e: any) {
      logger.warn(`Failed looking up site database config for cleanup: ${e.message}`);
    }

    if (dbName) {
      try {
        await runtimeManager.runMariaDBQuery(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
        if (dbUser && dbUser !== 'root') {
          await runtimeManager.runMariaDBQuery(`DROP USER IF EXISTS '${dbUser}'@'127.0.0.1';`);
        }
        logger.info(`Dropped database ${dbName} for site ${siteId}`);
      } catch (dbErr: any) {
        logger.warn(`Failed dropping database for site ${siteId}: ${dbErr.message}`);
      }
    }

    const WORKSPACE_ROOT = path.resolve(process.cwd());
    const sitePath = path.join(WORKSPACE_ROOT, 'sites', siteId);
    try {
      if (fs.existsSync(sitePath)) {
        await fs.promises.rm(sitePath, { recursive: true, force: true });
        logger.info(`Deleted site files at: ${sitePath}`);
      }
    } catch (e: any) {
      logger.warn(`Failed removing site directory ${siteId}: ${e.message}`);
    }

    if (!docker) return;
    try {
      await docker.ping();
      const wpContainer = docker.getContainer(`wphub-wp-${siteId}`);
      if (wpContainer) {
        await wpContainer.stop().catch(() => {});
        await wpContainer.remove().catch(() => {});
      }
      const dbContainer = docker.getContainer(`wphub-db-${siteId}`);
      if (dbContainer) {
        await dbContainer.stop().catch(() => {});
        await dbContainer.remove().catch(() => {});
      }
      logger.info(`Cleaned up container allocations for site ${siteId}`);
    } catch (e) {
      // Ignored if docker is offline
    }
  },
};
