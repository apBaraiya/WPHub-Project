import fs from 'fs';
import path from 'path';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const ghostPlugin: CMSModulePlugin = {
  manifest: {
    id: 'ghost',
    displayName: 'Ghost Publishing',
    version: '5.75.0',
    documentRoot: '',
    defaultPackageUrl: 'https://github.com/TryGhost/Ghost/archive/refs/tags/v5.75.0.zip',
    detectionMarkers: ['config.production.json', 'ghost-cli.json'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, config, dbConfig } = ctx;
    const proto = config.protocol || 'https';
    const ghostConfig = {
      url: `${proto}://${config.domain}`,
      server: { port: 2368, host: '127.0.0.1' },
      database: {
        client: 'mysql',
        connection: {
          host: dbConfig.dbHost,
          port: dbConfig.dbPort,
          user: dbConfig.dbUser,
          password: dbConfig.dbPass,
          database: dbConfig.dbName,
        },
      },
    };
    await fs.promises.writeFile(
      path.join(webRoot, 'config.production.json'),
      JSON.stringify(ghostConfig, null, 2),
      'utf8'
    );
  },

  async verifyInstall(_ctx: InstallContext): Promise<boolean> {
    return true;
  },
};

export default ghostPlugin;
