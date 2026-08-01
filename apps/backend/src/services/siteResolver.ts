import path from 'path';
import { installerRegistry } from './cmsInstallers';
import { cmsPluginLoader } from '../installers/pluginLoader';

export interface SiteLocationInfo {
  siteId: string;
  domain: string;
  sitePath: string;
  documentRootName: string;
  webRoot: string;
  scriptType?: string;
  documentRoot?: string;
}

const SITES_DIR = path.join(process.cwd(), 'sites');
const siteRegistryMap = new Map<string, SiteLocationInfo>();

export const siteResolver = {
  registerSite(siteId: string, info: Partial<SiteLocationInfo>) {
    const loc = this.resolveSiteLocation(siteId, info.scriptType || '');
    const updated: SiteLocationInfo = {
      ...loc,
      ...info,
      siteId,
      domain: info.domain || '',
    };
    siteRegistryMap.set(siteId, updated);
  },

  unregisterSite(siteId: string) {
    siteRegistryMap.delete(siteId);
  },

  getSite(siteId: string): SiteLocationInfo | undefined {
    return siteRegistryMap.get(siteId) || this.resolveSiteLocation(siteId, '');
  },

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
