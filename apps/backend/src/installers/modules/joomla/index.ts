import fs from 'fs';
import path from 'path';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const joomlaPlugin: CMSModulePlugin = {
  manifest: {
    id: 'joomla',
    displayName: 'Joomla CMS',
    version: '5.0.3',
    documentRoot: 'public_html',
    defaultPackageUrl: 'https://github.com/joomla/joomla-cms/releases/download/5.0.3/Joomla_5.0.3-Stable-Full_Package.zip',
    detectionMarkers: ['configuration.php', 'administrator/manifests'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, config, dbConfig } = ctx;
    const joomlaConfig = `<?php
class JConfig {
	public $dbtype = 'mysqli';
	public $host = '${dbConfig.dbHost}';
	public $user = '${dbConfig.dbUser}';
	public $password = '${dbConfig.dbPass}';
	public $db = '${dbConfig.dbName}';
	public $dbprefix = '${dbConfig.dbPrefix || 'joom_'}';
	public $sitename = '${config.siteName}';
}
`;
    await fs.promises.writeFile(path.join(webRoot, 'configuration.php'), joomlaConfig, 'utf8');
  },

  async verifyInstall(_ctx: InstallContext): Promise<boolean> {
    return true;
  },
};

export default joomlaPlugin;
