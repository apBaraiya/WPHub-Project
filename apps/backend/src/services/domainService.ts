import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb } from '../repositories/inMemoryDb';
import { logger } from '@wphub/utils';
import dns from 'dns';
import fs from 'fs';

// Reserved labels list that are banned from registration
const RESERVED_WORDS = new Set([
  'admin',
  'api',
  'mail',
  'ftp',
  'cpanel',
  'dashboard',
  'www',
  'root',
  'support',
  'status',
  'blog',
  'shop',
  'cdn',
  'assets',
  'static',
  'system',
  'server',
]);

async function lookupDns(domain: string): Promise<boolean> {
  return new Promise((resolve) => {
    // dns.lookup resolves host using host resolution mechanism of OS
    dns.lookup(domain, (err, address) => {
      if (!err && address) {
        resolve(true); // Active IP exists, domain is taken
        return;
      }
      // Fallback: check Nameservers NS records in case it has no A record
      dns.resolveNs(domain, (nsErr, addresses) => {
        if (!nsErr && addresses && addresses.length > 0) {
          resolve(true);
          return;
        }
        resolve(false); // No resolution, domain is not registered
      });
    });
  });
}

function tryAddHostsMapping(domain: string) {
  try {
    const hostsPath =
      process.platform === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts';

    if (fs.existsSync(hostsPath)) {
      const content = fs.readFileSync(hostsPath, 'utf8');
      if (!content.includes(domain)) {
        fs.appendFileSync(hostsPath, `\n127.0.0.1 ${domain}\n`);
      }
    }
  } catch (err) {
    // Fail silently if hosts file requires administrative permissions
  }
}

export const domainService = {
  /**
   * Sanitizes and validates the inputs name and extension.
   * Throws an error if invalid.
   */
  validateInputs(name: string, extension: string) {
    if (!name || !extension) {
      throw new Error('Domain name and extension are required');
    }

    const cleanName = name.trim();
    const cleanExt = extension.trim().replace(/^\./, ''); // remove leading dot if any

    // Length check
    const totalLength = cleanName.length + 1 + cleanExt.length;
    if (totalLength < 3 || totalLength > 63) {
      throw new Error('Domain name must be between 3 and 63 characters long');
    }

    // Security validation logic: Reject spaces, uppercase, special chars, multiple dots, SQL injections
    if (/[A-Z]/.test(cleanName)) {
      throw new Error('Domain name must not contain uppercase letters');
    }

    if (/\s/.test(cleanName)) {
      throw new Error('Domain name must not contain spaces');
    }

    // Only allow lowercase letters, numbers, and hyphens (standard DNS label rules)
    if (!/^[a-z0-9-]+$/.test(cleanName)) {
      throw new Error('Domain name contains invalid special characters');
    }

    // Unicode check (simple ASCII domain validation)
    for (let i = 0; i < cleanName.length; i++) {
      if (cleanName.charCodeAt(i) > 127) {
        throw new Error('Domain name must be in plain ASCII');
      }
    }

    // Banned/reserved words check
    if (RESERVED_WORDS.has(cleanName.toLowerCase())) {
      throw new Error('This domain prefix is reserved and cannot be registered');
    }

    return { name: cleanName, extension: cleanExt };
  },

  /**
   * Checks availability of a domain inside WPHub db and on the public internet.
   */
  async checkAvailability(
    name: string,
    extension: string,
  ): Promise<{ available: boolean; reason?: string }> {
    let sanitized;
    try {
      sanitized = this.validateInputs(name, extension);
    } catch (err: any) {
      return { available: false, reason: 'invalid_format' };
    }

    const fullDomainName = `${sanitized.name}.${sanitized.extension}`;

    // Validation 1: Check database registry presence
    if (isDbOffline) {
      const existing = inMemoryDb.domains.find((d) => d.domain === fullDomainName);
      if (existing) {
        return { available: false, reason: 'already_taken' };
      }
    } else {
      const existing = await prisma.domain.findUnique({
        where: { domain: fullDomainName },
      });
      if (existing) {
        return { available: false, reason: 'already_taken' };
      }
    }

    // Validation 2: Run real DNS lookup queries
    try {
      const publicExists = await lookupDns(fullDomainName);
      if (publicExists) {
        return { available: false, reason: 'public_domain_exists' };
      }
    } catch (e) {
      // Ignored: Treat as no DNS resolve
    }

    return { available: true };
  },

  /**
   * Overwrites/Maps a custom verified domain in the database.
   */
  async createDomain(userId: string, name: string, extension: string) {
    const sanitized = this.validateInputs(name, extension);
    const fullDomainName = `${sanitized.name}.${sanitized.extension}`;

    // Re-verify strictly on creation
    const dbAvailability = await this.checkAvailability(sanitized.name, sanitized.extension);
    if (!dbAvailability.available) {
      if (dbAvailability.reason === 'already_taken') {
        throw new Error('This domain has already been registered on WPHub');
      }
      if (dbAvailability.reason === 'public_domain_exists') {
        throw new Error('This domain already exists on the Internet. Please choose another name.');
      }
      throw new Error('Domain validation failed');
    }

    tryAddHostsMapping(fullDomainName);

    if (isDbOffline) {
      const newDomain = {
        id: 'dom-' + Math.random().toString(36).substr(2, 9),
        userId,
        name: sanitized.name,
        extension: sanitized.extension,
        domain: fullDomainName,
        type: sanitized.extension === 'site' ? 'Subdomain' : 'Primary',
        status: 'ACTIVE',
        ssl: true,
        dnsValid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryDb.domains.push(newDomain);
      logger.info(
        `[Offline] Mapped custom domain successfully: ${fullDomainName} for user: ${userId}`,
      );
      return newDomain;
    }

    const newDomain = await prisma.domain.create({
      data: {
        userId,
        name: sanitized.name,
        extension: sanitized.extension,
        domain: fullDomainName,
        type: sanitized.extension === 'site' ? 'Subdomain' : 'Primary',
        status: 'ACTIVE',
        ssl: true,
        dnsValid: true,
      },
    });

    logger.info(`Mapped custom domain successfully: ${fullDomainName} for user: ${userId}`);
    return newDomain;
  },
};
