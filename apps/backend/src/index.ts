import 'dotenv/config';
import app from './app';
import { logger } from '@wphub/utils';
import { checkDbConnection, prisma, isDbOffline } from './repositories/prisma';
import { runtimeManager } from './services/runtimeManager';
import { inMemoryDb } from './repositories/inMemoryDb';
import http from 'http';
import https from 'https';
import tls from 'tls';
import path from 'path';
import fs from 'fs';
import { sslService } from './services/sslService';

const apiPort = process.env.PORT || 5000;
const domainPort = 80;
const httpsPort = 443;
const WORKSPACE_ROOT = path.resolve(process.cwd());

// Initialize portable PHP, MariaDB, and phpMyAdmin runtimes
runtimeManager.ensureAllRuntimes();

// 1. Primary API Server (Port 5000)
app.listen(apiPort, async () => {
  // Test database connection at launch and set the mode (PostgreSQL or In-Memory)
  await checkDbConnection();
  logger.info(
    `Primary API Server is running on port ${apiPort} in ${process.env.NODE_ENV || 'development'} mode`,
  );

  // Auto-restart loopback servers for all active site installations if PHP is ready
  if (runtimeManager.isReady()) {
    try {
      let sitesList: any[] = [];
      if (isDbOffline) {
        sitesList = inMemoryDb.sites.filter((s) => s.status === 'ACTIVE');
      } else {
        sitesList = await prisma.site.findMany({ where: { status: 'ACTIVE' } });
      }

      for (const site of sitesList) {
        const sitePath = path.join(WORKSPACE_ROOT, 'sites', site.id);
        const webRoot = path.join(sitePath, 'public_html');
        await runtimeManager.startPhpServer(site.id, webRoot);
      }
    } catch (err: any) {
      logger.error(`Error restarting active site runtimes: ${err.message}`);
    }
  }
});

// 2. Secondary Custom Domain Server (Port 80)
const domainServer = http.createServer(app);

domainServer.on('error', (err: any) => {
  if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
    logger.warn(
      `Custom Domain Server (Port 80) is occupied or requires Administrator privileges. Custom domains will fall back to using port 5000. API Server is unaffected.`,
    );
  } else {
    logger.error(`Custom Domain Server error: ${err.message}`);
  }
});

try {
  domainServer.listen(domainPort, () => {
    logger.info(`Custom Domain Server is listening on port ${domainPort} for raw domain URLs.`);
  });
} catch (err: any) {
  logger.warn(`Could not start Custom Domain Server on port ${domainPort}: ${err.message}`);
}

// 3. Secure HTTPS Custom Domain Server (Port 443)
const SSL_STORAGE_DIR = path.join(WORKSPACE_ROOT, 'runtimes', 'ssl');

const getSecureContext = (servername: string) => {
  const cleanHost = (servername || 'wphub.cloud').toLowerCase().trim();
  const keyPath = path.join(SSL_STORAGE_DIR, `${cleanHost}.key`);
  const crtPath = path.join(SSL_STORAGE_DIR, `${cleanHost}.crt`);

  if (fs.existsSync(keyPath) && fs.existsSync(crtPath)) {
    return tls.createSecureContext({
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(crtPath),
    });
  }
  const certPair = sslService.generateCertificatePair(cleanHost);
  return tls.createSecureContext({
    key: certPair.key,
    cert: certPair.cert,
  });
};

const httpsDomainServer = https.createServer(
  {
    SNICallback: (servername, cb) => {
      try {
        const ctx = getSecureContext(servername);
        cb(null, ctx);
      } catch (err: any) {
        cb(err);
      }
    },
  },
  app,
);

httpsDomainServer.on('error', (err: any) => {
  if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
    logger.warn(
      `Secure HTTPS Domain Server (Port 443) is occupied or requires Administrator privileges. API Server is unaffected.`,
    );
  } else {
    logger.error(`Secure HTTPS Domain Server error: ${err.message}`);
  }
});

try {
  httpsDomainServer.listen(httpsPort, () => {
    logger.info(`Secure HTTPS Domain Server is listening on port ${httpsPort} for TLS domain URLs.`);
  });
} catch (err: any) {
  logger.warn(`Could not start HTTPS Server on port ${httpsPort}: ${err.message}`);
}
