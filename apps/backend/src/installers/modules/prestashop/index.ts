import fs from 'fs';
import path from 'path';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const prestashopPlugin: CMSModulePlugin = {
  manifest: {
    id: 'prestashop',
    displayName: 'PrestaShop eCommerce',
    version: '8.1.3',
    category: 'E-Commerce',
    documentRoot: 'public',
    entrypoint: 'index.php',
    databaseRequired: true,
    databaseType: 'mysql',
    healthCheckPath: '/',
    defaultPackageUrl:
      'https://github.com/PrestaShop/PrestaShop/releases/download/8.1.3/prestashop_8.1.3.zip',
    detectionMarkers: ['config/config.inc.php', 'app/config/parameters.php'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, dbConfig } = ctx;
    const configDir = path.join(webRoot, 'config');
    await fs.promises.mkdir(configDir, { recursive: true });

    const paramsContent = `<?php
return [
  'parameters' => [
    'database_host' => '${dbConfig.dbHost}',
    'database_port' => '${dbConfig.dbPort}',
    'database_name' => '${dbConfig.dbName}',
    'database_user' => '${dbConfig.dbUser}',
    'database_password' => '${dbConfig.dbPass}',
    'database_prefix' => '${dbConfig.dbPrefix || 'ps_'}',
    'secret' => '${Buffer.from(Math.random().toString()).toString('hex')}',
  ],
];
`;
    await fs.promises.writeFile(path.join(configDir, 'parameters.php'), paramsContent, 'utf8');

    // Ensure index.php exists
    const indexPhpPath = path.join(webRoot, 'index.php');
    if (!fs.existsSync(indexPhpPath)) {
      const defaultIndexPhp = `<?php
require_once __DIR__ . '/config/config.inc.php';
Dispatcher::getInstance()->dispatch();
`;
      await fs.promises.writeFile(indexPhpPath, defaultIndexPhp, 'utf8');
    }
  },

  async verifyInstall(ctx: InstallContext): Promise<boolean> {
    const { webRoot } = ctx;
    const configExists = fs.existsSync(path.join(webRoot, 'config', 'parameters.php'));
    const indexExists = fs.existsSync(path.join(webRoot, 'index.php'));
    return configExists && indexExists;
  },
};

export default prestashopPlugin;
