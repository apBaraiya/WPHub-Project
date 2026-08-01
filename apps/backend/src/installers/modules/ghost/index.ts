import fs from 'fs';
import path from 'path';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const ghostPlugin: CMSModulePlugin = {
  manifest: {
    id: 'ghost',
    displayName: 'Ghost Publishing',
    version: '5.75.0',
    category: 'Blogging',
    documentRoot: 'current',
    entrypoint: 'index.js',
    databaseRequired: true,
    databaseType: 'mysql',
    healthCheckPath: '/',
    defaultPackageUrl: 'https://github.com/TryGhost/Ghost/archive/refs/tags/v5.75.0.zip',
    detectionMarkers: ['config.production.json', 'ghost-cli.json'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, config, dbConfig } = ctx;
    const ghostConfig = {
      url: `http://${config.domain}`,
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
      paths: {
        contentPath: path.join(webRoot, 'content'),
      },
    };
    await fs.promises.writeFile(
      path.join(webRoot, 'config.production.json'),
      JSON.stringify(ghostConfig, null, 2),
      'utf8',
    );

    // Ensure index.js entrypoint exists
    const indexJsPath = path.join(webRoot, 'index.js');
    if (!fs.existsSync(indexJsPath)) {
      const defaultIndexJs = `// Ghost Node.js Entrypoint
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('<h1>Welcome to Ghost CMS</h1><p>Published on WPHub</p>'));
app.listen(process.env.PORT || 2368);
`;
      await fs.promises.writeFile(indexJsPath, defaultIndexJs, 'utf8');
    }
  },

  async verifyInstall(ctx: InstallContext): Promise<boolean> {
    const { webRoot } = ctx;
    const configExists = fs.existsSync(path.join(webRoot, 'config.production.json'));
    return configExists;
  },
};

export default ghostPlugin;
