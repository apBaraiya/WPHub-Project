import { CMSModulePlugin, InstallContext } from '../../pluginLoader';

const drupalPlugin: CMSModulePlugin = {
  manifest: {
    id: 'drupal',
    displayName: 'Drupal CMS',
    version: 'latest',
    documentRoot: 'web',
    defaultPackageUrl: 'https://www.drupal.org/download-latest/zip',
    detectionMarkers: ['web/sites', 'core/lib/Drupal.php'],
    main: 'index.ts',
  },

  async verifyInstall(_ctx: InstallContext): Promise<boolean> {
    return true;
  },
};

export default drupalPlugin;
