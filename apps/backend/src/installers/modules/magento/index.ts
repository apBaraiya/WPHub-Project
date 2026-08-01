import fs from 'fs';
import path from 'path';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const magentoPlugin: CMSModulePlugin = {
  manifest: {
    id: 'magento',
    displayName: 'Magento Commerce',
    version: '2.4.6',
    category: 'E-Commerce',
    documentRoot: 'pub',
    entrypoint: 'index.php',
    databaseRequired: true,
    databaseType: 'mysql',
    healthCheckPath: '/',
    defaultPackageUrl: 'https://github.com/magento/magento2/archive/refs/tags/2.4.6.zip',
    detectionMarkers: ['app/etc/env.php', 'bin/magento'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, dbConfig } = ctx;
    const baseDir = path.dirname(webRoot);
    const etcDir = path.join(baseDir, 'app', 'etc');
    await fs.promises.mkdir(etcDir, { recursive: true });

    const envPhpContent = `<?php
return [
    'backend' => [
        'frontName' => 'admin'
    ],
    'db' => [
        'connection' => [
            'default' => [
                'host' => '${dbConfig.dbHost}',
                'dbname' => '${dbConfig.dbName}',
                'username' => '${dbConfig.dbUser}',
                'password' => '${dbConfig.dbPass}',
                'active' => '1',
                'driver_options' => [
                    1002 => 'SET NAMES utf8'
                ]
            ]
        ],
        'table_prefix' => '${dbConfig.dbPrefix || 'mg_'}'
    ],
    'crypt' => [
        'key' => '${Buffer.from(Math.random().toString()).toString('hex')}'
    ],
    'resource' => [
        'default_setup' => [
            'connection' => 'default'
        ]
    ],
    'x-frame-options' => 'SAMEORIGIN',
    'MAGE_MODE' => 'developer'
];
`;
    await fs.promises.writeFile(path.join(etcDir, 'env.php'), envPhpContent, 'utf8');

    // Ensure pub/index.php exists
    const indexPhpPath = path.join(webRoot, 'index.php');
    if (!fs.existsSync(indexPhpPath)) {
      const defaultIndexPhp = `<?php
try {
    require __DIR__ . '/../app/bootstrap.php';
} catch (\\Exception $e) {
    echo "<h1>Magento Initializing...</h1>";
}
`;
      await fs.promises.writeFile(indexPhpPath, defaultIndexPhp, 'utf8');
    }
  },

  async verifyInstall(ctx: InstallContext): Promise<boolean> {
    const { webRoot } = ctx;
    const baseDir = path.dirname(webRoot);
    const envExists = fs.existsSync(path.join(baseDir, 'app', 'etc', 'env.php'));
    const indexExists = fs.existsSync(path.join(webRoot, 'index.php'));
    return envExists && indexExists;
  },
};

export default magentoPlugin;
