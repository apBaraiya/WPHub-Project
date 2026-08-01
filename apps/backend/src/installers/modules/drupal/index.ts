import fs from 'fs';
import path from 'path';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const drupalPlugin: CMSModulePlugin = {
  manifest: {
    id: 'drupal',
    displayName: 'Drupal CMS',
    version: 'latest',
    category: 'CMS',
    documentRoot: 'web',
    entrypoint: 'index.php',
    databaseRequired: true,
    databaseType: 'mysql',
    healthCheckPath: '/',
    defaultPackageUrl: 'https://www.drupal.org/download-latest/zip',
    detectionMarkers: ['web/sites', 'core/lib/Drupal.php'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, config, dbConfig } = ctx;
    const defaultSiteDir = path.join(webRoot, 'sites', 'default');
    await fs.promises.mkdir(defaultSiteDir, { recursive: true });

    const settingsContent = `<?php
$databases['default']['default'] = array (
  'database' => '${dbConfig.dbName}',
  'username' => '${dbConfig.dbUser}',
  'password' => '${dbConfig.dbPass}',
  'prefix' => '${dbConfig.dbPrefix || 'drupal_'}',
  'host' => '${dbConfig.dbHost}',
  'port' => '${dbConfig.dbPort}',
  'namespace' => 'Drupal\\\\Core\\\\Database\\\\Driver\\\\mysql',
  'driver' => 'mysql',
);
$settings['hash_salt'] = '${Buffer.from(Math.random().toString()).toString('hex')}';
$settings['update_free_access'] = FALSE;
$settings['container_yamls'][] = $app_root . '/' . $site_path . '/services.yml';
$settings['file_scan_ignore_directories'] = [
  'node_modules',
  'bower_components',
];
$settings['entity_update_batch_size'] = 50;
$settings['entity_update_backup'] = TRUE;
$settings['trusted_host_patterns'] = [
  '^${config.domain.replace(/\./g, '\\\\.')}$',
];
`;

    await fs.promises.writeFile(path.join(defaultSiteDir, 'settings.php'), settingsContent, 'utf8');

    // Ensure index.php exists
    const indexPhpPath = path.join(webRoot, 'index.php');
    if (!fs.existsSync(indexPhpPath)) {
      const defaultIndexPhp = `<?php
use Drupal\\Core\\DrupalKernel;
use Symfony\\Component\\HttpFoundation\\Request;

$autoloader = require_once __DIR__ . '/autoload.php';
$kernel = new DrupalKernel('prod', $autoloader);
$request = Request::createFromGlobals();
$response = $kernel->handle($request);
$response->send();
$kernel->terminate($request, $response);
`;
      await fs.promises.writeFile(indexPhpPath, defaultIndexPhp, 'utf8');
    }
  },

  async executeInstall(ctx: InstallContext): Promise<void> {
    const { webRoot } = ctx;
    const filesDir = path.join(webRoot, 'sites', 'default', 'files');
    await fs.promises.mkdir(filesDir, { recursive: true });
  },

  async verifyInstall(ctx: InstallContext): Promise<boolean> {
    const { webRoot } = ctx;
    const settingsExists = fs.existsSync(path.join(webRoot, 'sites', 'default', 'settings.php'));
    const indexExists = fs.existsSync(path.join(webRoot, 'index.php'));
    return settingsExists && indexExists;
  },
};

export default drupalPlugin;
