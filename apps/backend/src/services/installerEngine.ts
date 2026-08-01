import { cmsProvisioningEngine } from './cmsProvisioningEngine';

export interface InstallConfig {
  siteId: string;
  appName: string; // WordPress, Joomla, Drupal, Laravel, PrestaShop, Magento, Ghost
  appVersion: string;
  protocol: string;
  domain: string;
  directory: string; // relative sub-path e.g. "" or "blog"
  siteName: string;
  siteDescription: string;
  adminUser: string;
  adminPass: string;
  adminEmail: string;
  dbName?: string;
  dbUser?: string;
  dbPrefix: string;
}

// Progress listener registry (SSE)
const progressMap = new Map<string, (step: string, progress: number) => void>();

export const installerEngine = {
  // Register active progress callback listener
  registerProgressCallback(siteId: string, cb: (step: string, progress: number) => void) {
    progressMap.set(siteId, cb);
  },

  unregisterProgressCallback(siteId: string) {
    progressMap.delete(siteId);
  },

  async runInstallation(userId: string, cfg: InstallConfig) {
    const { siteId } = cfg;
    cmsProvisioningEngine.registerListener(siteId, (state) => {
      const cb = progressMap.get(siteId);
      if (cb) cb(state.step, state.progress);
    });

    try {
      await cmsProvisioningEngine.provisionSite(userId, cfg);
    } finally {
      cmsProvisioningEngine.unregisterListener(siteId);
    }
  },
};
