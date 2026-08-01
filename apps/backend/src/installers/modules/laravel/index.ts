import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const laravelPlugin: CMSModulePlugin = {
  manifest: {
    id: 'laravel',
    displayName: 'Laravel Framework',
    version: '10.x',
    category: 'Framework',
    documentRoot: 'public',
    entrypoint: 'index.php',
    databaseRequired: true,
    databaseType: 'mysql',
    healthCheckPath: '/',
    defaultPackageUrl: 'https://github.com/laravel/laravel/archive/refs/heads/10.x.zip',
    detectionMarkers: ['artisan', 'bootstrap/app.php'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, config, dbConfig } = ctx;
    const baseDir = path.dirname(webRoot);
    const key = 'base64:' + crypto.randomBytes(32).toString('base64');

    const envContent = `APP_NAME="${config.siteName || 'Laravel App'}"
APP_ENV=production
APP_KEY=${key}
APP_DEBUG=true
APP_URL=http://${config.domain}

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=${dbConfig.dbHost}
DB_PORT=${dbConfig.dbPort}
DB_DATABASE=${dbConfig.dbName}
DB_USERNAME=${dbConfig.dbUser}
DB_PASSWORD=${dbConfig.dbPass}
`;

    await fs.promises.writeFile(path.join(baseDir, '.env'), envContent, 'utf8');

    // Ensure public/index.php exists
    const indexPhpPath = path.join(webRoot, 'index.php');
    if (!fs.existsSync(indexPhpPath)) {
      const defaultIndexPhp = `<?php
define('LARAVEL_START', microtime(true));
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\\Contracts\\Http\\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\\Http\\Request::capture()
)->send();
$kernel->terminate($request, $response);
`;
      await fs.promises.writeFile(indexPhpPath, defaultIndexPhp, 'utf8');
    }
  },

  async executeInstall(ctx: InstallContext): Promise<void> {
    const { webRoot } = ctx;
    // Create storage directories
    const baseDir = path.dirname(webRoot);
    const dirs = [
      path.join(baseDir, 'storage', 'framework', 'views'),
      path.join(baseDir, 'storage', 'framework', 'sessions'),
      path.join(baseDir, 'storage', 'framework', 'cache'),
      path.join(baseDir, 'storage', 'logs'),
      path.join(baseDir, 'bootstrap', 'cache'),
    ];
    for (const d of dirs) {
      await fs.promises.mkdir(d, { recursive: true });
    }
  },

  async verifyInstall(ctx: InstallContext): Promise<boolean> {
    const { webRoot } = ctx;
    const baseDir = path.dirname(webRoot);
    const envExists = fs.existsSync(path.join(baseDir, '.env'));
    const indexExists = fs.existsSync(path.join(webRoot, 'index.php'));
    return envExists && indexExists;
  },
};

export default laravelPlugin;
