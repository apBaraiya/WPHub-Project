import fs from 'fs';
import path from 'path';
import { logger } from '@wphub/utils';

export interface CMSRuleProfile {
  cmsId: string;
  displayName: string;
  documentRoot: string;
  isReverseProxy: boolean;
  proxyTargetPort?: number;
  phpVersion: string;
  nginxRewriteRules: string;
  apacheRewriteRules: string;
  traefikMiddlewares: string[];
}

export type WebServerType = 'nginx' | 'apache' | 'traefik' | 'php-dev';

// CMS Signatures Catalog
const CMS_SIGNATURES: Record<string, { markers: string[]; documentRoot: string; displayName: string; nginxRules: string; apacheRules: string }> = {
  wordpress: {
    markers: ['wp-config.php', 'wp-load.php', 'wp-includes'],
    documentRoot: 'public_html',
    displayName: 'WordPress',
    nginxRules: `
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass 127.0.0.1:__PHP_PORT__;
    }
`,
    apacheRules: `
    <Directory "__WEB_ROOT__">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
`,
  },
  laravel: {
    markers: ['artisan', 'bootstrap/app.php', 'composer.json'],
    documentRoot: 'public',
    displayName: 'Laravel',
    nginxRules: `
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass 127.0.0.1:__PHP_PORT__;
    }
`,
    apacheRules: `
    <Directory "__WEB_ROOT__">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
`,
  },
  drupal: {
    markers: ['web/sites', 'core/lib/Drupal.php'],
    documentRoot: 'web',
    displayName: 'Drupal',
    nginxRules: `
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass 127.0.0.1:__PHP_PORT__;
    }
`,
    apacheRules: `
    <Directory "__WEB_ROOT__">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
`,
  },
  joomla: {
    markers: ['configuration.php', 'administrator/manifests'],
    documentRoot: 'public_html',
    displayName: 'Joomla',
    nginxRules: `
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass 127.0.0.1:__PHP_PORT__;
    }
`,
    apacheRules: `
    <Directory "__WEB_ROOT__">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
`,
  },
  ghost: {
    markers: ['config.production.json', 'ghost-cli.json'],
    documentRoot: '',
    displayName: 'Ghost',
    nginxRules: `
    location / {
        proxy_pass http://127.0.0.1:2368;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
`,
    apacheRules: `
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:2368/
    ProxyPassReverse / http://127.0.0.1:2368/
`,
  },
  magento: {
    markers: ['app/etc/env.php', 'bin/magento'],
    documentRoot: 'pub',
    displayName: 'Magento',
    nginxRules: `
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass 127.0.0.1:__PHP_PORT__;
    }
`,
    apacheRules: `
    <Directory "__WEB_ROOT__">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
`,
  },
};

export const webServerEngine = {
  /**
   * Automatically detect installed CMS from site directory signatures
   */
  async detectCMS(sitePath: string): Promise<CMSRuleProfile> {
    for (const [cmsId, meta] of Object.entries(CMS_SIGNATURES)) {
      const docPath = meta.documentRoot ? path.join(sitePath, meta.documentRoot) : sitePath;
      
      for (const marker of meta.markers) {
        if (fs.existsSync(path.join(sitePath, marker)) || fs.existsSync(path.join(docPath, marker))) {
          logger.info(`Detected CMS signature "${cmsId}" in site: ${sitePath}`);
          return {
            cmsId,
            displayName: meta.displayName,
            documentRoot: meta.documentRoot,
            isReverseProxy: cmsId === 'ghost',
            proxyTargetPort: cmsId === 'ghost' ? 2368 : undefined,
            phpVersion: '8.2',
            nginxRewriteRules: meta.nginxRules,
            apacheRewriteRules: meta.apacheRules,
            traefikMiddlewares: ['gzip', 'security-headers'],
          };
        }
      }
    }

    // Default Generic Web Application Fallback
    logger.info(`No specific CMS signature matched in ${sitePath}. Defaulting to Generic profile.`);
    return {
      cmsId: 'generic',
      displayName: 'Generic Web App',
      documentRoot: 'public_html',
      isReverseProxy: false,
      phpVersion: '8.2',
      nginxRewriteRules: `
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass 127.0.0.1:__PHP_PORT__;
    }
`,
      apacheRewriteRules: `
    <Directory "__WEB_ROOT__">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
`,
      traefikMiddlewares: ['gzip'],
    };
  },

  /**
   * Generate Nginx Server Block VirtualHost Config
   */
  generateNginxConfig(domain: string, webRoot: string, phpPort: number, profile: CMSRuleProfile): string {
    const rules = profile.nginxRewriteRules.replace(/__PHP_PORT__/g, phpPort.toString());
    return `# Nginx VirtualHost Configuration for ${domain} (${profile.displayName})
server {
    listen 80;
    server_name ${domain};
    root ${webRoot.replace(/\\/g, '/')};
    index index.php index.html index.htm;

    client_max_body_size 64M;

    ${rules}

    location ~ /\\.ht {
        deny all;
    }

    access_log /var/log/nginx/${domain}_access.log;
    error_log /var/log/nginx/${domain}_error.log;
}
`;
  },

  /**
   * Generate Apache VirtualHost Config
   */
  generateApacheConfig(domain: string, webRoot: string, phpPort: number, profile: CMSRuleProfile): string {
    const rules = profile.apacheRewriteRules.replace(/__WEB_ROOT__/g, webRoot.replace(/\\/g, '/'));
    return `# Apache VirtualHost Configuration for ${domain} (${profile.displayName})
<VirtualHost *:80>
    ServerName ${domain}
    DocumentRoot "${webRoot.replace(/\\/g, '/')}"

    ${rules}

    <FilesMatch \\.php$>
        SetHandler "proxy:fcgi://127.0.0.1:${phpPort}"
    </FilesMatch>

    ErrorLog \${APACHE_LOG_DIR}/${domain}_error.log
    CustomLog \${APACHE_LOG_DIR}/${domain}_access.log combined
</VirtualHost>
`;
  },

  /**
   * Generate Traefik Dynamic YAML Router Config
   */
  generateTraefikConfig(domain: string, phpPort: number, profile: CMSRuleProfile): string {
    const targetPort = profile.isReverseProxy ? (profile.proxyTargetPort || 2368) : phpPort;
    const config = {
      http: {
        routers: {
          [`${domain}-router`]: {
            rule: `Host(\`${domain}\`)`,
            service: `${domain}-service`,
            entryPoints: ['web', 'websecure'],
            tls: {
              certResolver: 'letsencrypt',
            },
          },
        },
        services: {
          [`${domain}-service`]: {
            loadBalancer: {
              servers: [
                {
                  url: `http://127.0.0.1:${targetPort}`,
                },
              ],
            },
          },
        },
      },
    };
    return `# Traefik Dynamic Provider Config for ${domain}\n` + JSON.stringify(config, null, 2);
  },

  /**
   * Generate Built-In PHP Dev Server Router File
   */
  generatePhpRouterScript(): string {
    return `<?php
$root = $_SERVER['DOCUMENT_ROOT'];
chdir($root);
$path = '/' . ltrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

if (file_exists($root . $path)) {
    return false;
}

if (file_exists($root . '/index.php')) {
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['SCRIPT_FILENAME'] = $root . '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';
    include $root . '/index.php';
} else {
    return false;
}
`;
  },

  /**
   * Master Config Generator dispatcher
   */
  async generateConfig(
    serverType: WebServerType,
    domain: string,
    sitePath: string,
    phpPort: number
  ): Promise<string> {
    const profile = await this.detectCMS(sitePath);
    const webRoot = profile.documentRoot ? path.join(sitePath, profile.documentRoot) : sitePath;

    switch (serverType) {
      case 'nginx':
        return this.generateNginxConfig(domain, webRoot, phpPort, profile);
      case 'apache':
        return this.generateApacheConfig(domain, webRoot, phpPort, profile);
      case 'traefik':
        return this.generateTraefikConfig(domain, phpPort, profile);
      case 'php-dev':
        return this.generatePhpRouterScript();
      default:
        return this.generateNginxConfig(domain, webRoot, phpPort, profile);
    }
  },
};
