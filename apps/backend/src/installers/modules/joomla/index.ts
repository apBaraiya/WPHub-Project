import fs from 'fs';
import path from 'path';
import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const joomlaPlugin: CMSModulePlugin = {
  manifest: {
    id: 'joomla',
    displayName: 'Joomla CMS',
    version: '5.0.3',
    category: 'CMS',
    documentRoot: 'public_html',
    entrypoint: 'index.php',
    databaseRequired: true,
    databaseType: 'mysql',
    healthCheckPath: '/',
    defaultPackageUrl:
      'https://github.com/joomla/joomla-cms/releases/download/5.0.3/Joomla_5.0.3-Stable-Full_Package.zip',
    detectionMarkers: ['configuration.php', 'administrator/manifests'],
    main: 'index.ts',
  },

  async generateConfig(ctx: InstallContext): Promise<void> {
    const { webRoot, config, dbConfig } = ctx;
    const secret = Buffer.from(Math.random().toString()).toString('hex').substring(0, 16);

    const joomlaConfig = `<?php
class JConfig {
	public $dbtype = 'mysqli';
	public $host = '${dbConfig.dbHost}';
	public $user = '${dbConfig.dbUser}';
	public $password = '${dbConfig.dbPass}';
	public $db = '${dbConfig.dbName}';
	public $dbprefix = '${dbConfig.dbPrefix || 'joom_'}';
	public $sitename = '${config.siteName || 'Joomla Site'}';
	public $secret = '${secret}';
	public $live_site = 'http://${config.domain}';
	public $offline = '0';
	public $editor = 'tinymce';
	public $captcha = '0';
	public $access = '1';
	public $debug = '0';
	public $log_path = '${path.join(webRoot, 'administrator', 'logs').replace(/\\/g, '/')}';
	public $tmp_path = '${path.join(webRoot, 'tmp').replace(/\\/g, '/')}';
}
`;
    await fs.promises.writeFile(path.join(webRoot, 'configuration.php'), joomlaConfig, 'utf8');

    // Ensure index.php exists
    const indexPhpPath = path.join(webRoot, 'index.php');
    if (!fs.existsSync(indexPhpPath)) {
      const defaultIndexPhp = `<?php
define('_JEXEC', 1);
define('JPATH_BASE', __DIR__);
require_once JPATH_BASE . '/includes/defines.php';
require_once JPATH_BASE . '/includes/framework.php';
$app = JFactory::getApplication('site');
$app->execute();
`;
      await fs.promises.writeFile(indexPhpPath, defaultIndexPhp, 'utf8');
    }
  },

  async verifyInstall(ctx: InstallContext): Promise<boolean> {
    const { webRoot } = ctx;
    const configExists = fs.existsSync(path.join(webRoot, 'configuration.php'));
    const indexExists = fs.existsSync(path.join(webRoot, 'index.php'));
    return configExists && indexExists;
  },
};

export default joomlaPlugin;
