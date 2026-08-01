import path from 'path';
import { installerRegistry } from './cmsInstallers';
import { cmsPluginLoader } from '../installers/pluginLoader';

export interface SiteLocationInfo {
  siteId: string;
  domain: string;
  sitePath: string;
  documentRootName: string;
  webRoot: string;
}

const SITES_DIR = path.join(process.cwd(), 'sites');

export const siteResolver = {
  /**
   * Resolve site path and official webRoot from installer module manifest
   */
  resolveSiteLocation(siteId: string, appName: string, subDirectory = ''): SiteLocationInfo {
    const sitePath = path.join(SITES_DIR, siteId);
    let documentRootName = 'public_html';

    try {
      const plugin = cmsPluginLoader.getModule(appName);
      if (plugin && plugin.manifest && plugin.manifest.documentRoot !== undefined) {
        documentRootName = plugin.manifest.documentRoot;
      } else {
        const installer = installerRegistry.get(appName);
        documentRootName = installer.documentRoot;
      }
    } catch (_e) {
      documentRootName = 'public_html';
    }

    let webRoot = documentRootName ? path.join(sitePath, documentRootName) : sitePath;
    if (subDirectory) {
      webRoot = path.join(webRoot, subDirectory);
    }

    return {
      siteId,
      domain: '',
      sitePath,
      documentRootName,
      webRoot,
    };
  },
};
