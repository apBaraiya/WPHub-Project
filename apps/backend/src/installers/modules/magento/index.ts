import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const magentoPlugin: CMSModulePlugin = {
  manifest: {
    id: 'magento',
    displayName: 'Magento Commerce',
    version: '2.4.6',
    documentRoot: 'pub',
    defaultPackageUrl: 'https://github.com/magento/magento2/archive/refs/tags/2.4.6.zip',
    detectionMarkers: ['app/etc/env.php', 'bin/magento'],
    main: 'index.ts',
  },

  async verifyInstall(_ctx: InstallContext): Promise<boolean> {
    return true;
  },
};

export default magentoPlugin;
