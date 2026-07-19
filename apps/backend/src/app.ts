import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import siteRoutes from './routes/sites';
import domainRoutes from './routes/domains';
import installerRoutes from './routes/installers';
import fileRoutes from './routes/files';
import databaseRoutes from './routes/databases';
import { logger } from '@wphub/utils';
import { runtimeManager } from './services/runtimeManager';
import { prisma, isDbOffline } from './repositories/prisma';
import { inMemoryDb } from './repositories/inMemoryDb';
import http from 'http';

const app: express.Application = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Request logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

function proxyRequest(req: Request, res: Response, targetPort: number) {
  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: req.headers.host, // Pass custom host to PHP server
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res
      .status(502)
      .send(`<h1>502 Bad Gateway</h1><p>Failed to connect to local PHP server: ${err.message}</p>`);
  });

  req.pipe(proxyReq, { end: true });
}

// Multi-tenant reverse proxy host routing middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host || '';
  const cleanHost = host.split(':')[0].toLowerCase();

  // Route phpMyAdmin requests to loopback server on port 8090
  if (cleanHost && cleanHost.startsWith('phpmyadmin.')) {
    proxyRequest(req, res, 8090);
    return;
  }

  if (
    cleanHost &&
    cleanHost !== 'localhost' &&
    cleanHost !== '127.0.0.1' &&
    !cleanHost.startsWith('192.168')
  ) {
    let site;
    if (isDbOffline) {
      site = inMemoryDb.sites.find((s) => s.domain.toLowerCase() === cleanHost);
    } else {
      site = await prisma.site.findFirst({
        where: { domain: { equals: cleanHost, mode: 'insensitive' } },
      });
    }

    if (site) {
      const port = runtimeManager.getSitePort(site.id);
      if (port) {
        proxyRequest(req, res, port);
        return;
      }
    }

    req.url = '/api/sites/preview-domain-internal';
    req.query.domain = cleanHost;
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/installers', installerRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/databases', databaseRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      uptime: process.uptime(),
    },
  });
});

app.get('/api/runtimes/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      phpReady: runtimeManager.isReady(),
      command: runtimeManager.getPhpCommand(),
    },
  });
});

// 404 Route handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Resource not found',
      code: 'NOT_FOUND',
    },
  });
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled exception: ${err.message}`, err.stack);

  const status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Sanitize database/Docker connection errors
  if (
    message.includes("Can't reach database server") ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('docker') ||
    message.includes('PrismaClientInitializationError') ||
    err.code === 'P1001' ||
    err.code === 'P1002' ||
    err.code === 'P1003' ||
    err.code === 'P1011'
  ) {
    message = 'Provisioning service is temporarily unavailable.';
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      details:
        process.env.NODE_ENV === 'development' &&
        message !== 'Provisioning service is temporarily unavailable.'
          ? err.stack
          : undefined,
    },
  });
});

export default app;
