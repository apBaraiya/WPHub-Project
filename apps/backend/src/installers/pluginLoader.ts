import fs from 'fs';
import path from 'path';
import { logger } from '@wphub/utils';
import { InstallConfig } from '../services/installerEngine';
import { DatabaseConfig } from '../services/cmsInstallers';

export interface InstallContext {
  siteId: string;
  domain: string;
  sitePath: string;
  webRoot: string;
  dbConfig: DatabaseConfig;
  config: InstallConfig;
}

export interface CMSModuleManifest {
  id: string;
  displayName: string;
  version: string;
  category?: 'CMS' | 'Framework' | 'E-Commerce' | 'Blogging';
  documentRoot: string;
  entrypoint?: string;
  databaseRequired?: boolean;
  databaseType?: 'mysql' | 'sqlite' | 'postgres';
  requiredExtensions?: string[];
  healthCheckPath?: string;
  defaultPackageUrl: string;
  detectionMarkers: string[];
  main?: string;
}

export interface CMSModulePlugin {
  manifest: CMSModuleManifest;
  preInstall?(ctx: InstallContext): Promise<void>;
  generateConfig?(ctx: InstallContext): Promise<void>;
  executeInstall?(ctx: InstallContext): Promise<void>;
  verifyInstall?(ctx: InstallContext): Promise<boolean>;
  cleanup?(ctx: InstallContext): Promise<void>;
  onRollback?(ctx: InstallContext, error: Error): Promise<void>;
}

export class CMSPluginLoader {
  private modulesDir: string;
  private registry = new Map<string, CMSModulePlugin>();

  constructor(modulesDir?: string) {
    this.modulesDir = modulesDir || path.join(__dirname, 'modules');
  }

  /**
   * Automatically scan modules directory and register installer plugins
   */
  async discoverAndLoadModules(): Promise<Map<string, CMSModulePlugin>> {
    this.registry.clear();

    if (!fs.existsSync(this.modulesDir)) {
      await fs.promises.mkdir(this.modulesDir, { recursive: true });
      return this.registry;
    }

    const entries = await fs.promises.readdir(this.modulesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const moduleFolder = path.join(this.modulesDir, entry.name);
        const manifestPath = path.join(moduleFolder, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
          try {
            const manifestData = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8')) as CMSModuleManifest;
            const entryFileName = manifestData.main || 'index.ts';
            const entryFile = path.join(moduleFolder, entryFileName);

            let plugin: CMSModulePlugin;
            if (fs.existsSync(entryFile)) {
              // Dynamic import of module
              const imported = await import(entryFile);
              plugin = imported.default || imported;
            } else {
              // Create generic module implementation from manifest metadata
              plugin = {
                manifest: manifestData,
                verifyInstall: async () => true,
              };
            }

            this.registry.set(manifestData.id.toLowerCase(), plugin);
            logger.info(`Loaded CMS Installer Module: [${manifestData.id}] -> ${manifestData.displayName}`);
          } catch (err: any) {
            logger.error(`Failed to load CMS Module in ${entry.name}: ${err.message}`);
          }
        }
      }
    }
    return this.registry;
  }

  getModule(slug: string): CMSModulePlugin {
    const plugin = this.registry.get(slug.toLowerCase());
    if (!plugin) {
      // Fallback plugin generator if module directory not created yet
      return {
        manifest: {
          id: slug,
          displayName: slug.charAt(0).toUpperCase() + slug.slice(1),
          version: 'latest',
          category: 'CMS',
          documentRoot:
            slug === 'wordpress' || slug === 'joomla'
              ? 'public_html'
              : slug === 'laravel' || slug === 'prestashop'
                ? 'public'
                : slug === 'drupal'
                  ? 'web'
                  : slug === 'magento'
                    ? 'pub'
                    : slug === 'ghost'
                      ? 'current'
                      : '',
          entrypoint: slug === 'ghost' ? 'index.js' : 'index.php',
          databaseRequired: true,
          databaseType: 'mysql',
          defaultPackageUrl: `https://github.com/${slug}/${slug}/archive/refs/heads/main.zip`,
          detectionMarkers: [],
          healthCheckPath: '/',
        },
        verifyInstall: async () => true,
      };
    }
    return plugin;
  }

  getAllModules(): CMSModulePlugin[] {
    return Array.from(this.registry.values());
  }
}

export const cmsPluginLoader = new CMSPluginLoader();
