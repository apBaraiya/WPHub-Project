import fs from 'fs';
import path from 'path';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const laravelPlugin: CMSModulePlugin = {
  manifest: {
    id: 'laravel',
    displayName: 'Laravel Framework',
    version: '10.x',
    documentRoot: 'public',
    defaultPackageUrl: 'https://github.com/laravel/laravel/archive/refs/heads/10.x.zip',
    detectionMarkers: ['artisan', 'bootstrap/app.php'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, config, dbConfig } = ctx;
    const envContent = `APP_NAME="${config.siteName}"
APP_ENV=local
APP_KEY=base64:${Buffer.from(Math.random().toString()).toString('base64')}
APP_DEBUG=true
APP_URL=http://${config.domain}

DB_CONNECTION=mysql
DB_HOST=${dbConfig.dbHost}
DB_PORT=${dbConfig.dbPort}
DB_DATABASE=${dbConfig.dbName}
DB_USERNAME=${dbConfig.dbUser}
DB_PASSWORD=${dbConfig.dbPass}
`;
    await fs.promises.writeFile(path.join(webRoot, '..', '.env'), envContent, 'utf8');
  },

  async verifyInstall(_ctx: InstallContext): Promise<boolean> {
    return true;
  },
};

export default laravelPlugin;
