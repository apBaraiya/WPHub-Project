import { Role } from '@prisma/client';
import { hashPassword } from '@wphub/utils';
import fs from 'fs';
import path from 'path';

export interface InMemoryUser {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    id: string;
    userId: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  settings?: {
    id: string;
    userId: string;
    twoFactorEnabled: boolean;
  };
  preferences?: {
    id: string;
    userId: string;
    theme: string;
    notificationsEnabled: boolean;
  };
}

export interface InMemorySite {
  id: string;
  userId: string;
  name: string;
  domain: string;
  status: string;
  phpVersion: string;
  wpVersion: string;
  scriptType?: string | null;
  scriptVersion?: string | null;
  dbName?: string | null;
  dbUser?: string | null;
  dbPrefix?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryInstallHistory {
  id: string;
  userId: string;
  siteId: string;
  appName: string;
  appVersion: string;
  domain: string;
  status: string;
  createdAt: Date;
}

export interface InMemoryDomain {
  id: string;
  userId: string;
  siteId?: string | null;
  name: string;
  extension: string;
  domain: string;
  type: string;
  status: string;
  ssl: boolean;
  dnsValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface InMemorySession {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface InMemoryDatabaseInstance {
  id: string;
  userId: string;
  name: string;
  dbUser: string;
  dbPass: string;
  size: string;
  tables: number;
  createdAt: Date;
}

export interface InMemoryCertificate {
  id: string;
  domainId?: string | null;
  siteId?: string | null;
  hostname: string;
  status: 'PENDING' | 'REQUESTING' | 'ISSUED' | 'ACTIVE' | 'RENEWING' | 'EXPIRING' | 'EXPIRED' | 'FAILED' | 'DNS_NOT_CONFIGURED' | 'DOMAIN_NOT_REACHABLE';
  issuer: string;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  lastRenewalAt?: Date | null;
  lastError?: string | null;
  autoRenew: boolean;
  dnsValid: boolean;
  httpsValid: boolean;
  sanList: string[];
  createdAt: Date;
  updatedAt: Date;
}

class InMemoryDatabase {
  users: InMemoryUser[] = [];
  sites: InMemorySite[] = [];
  domains: InMemoryDomain[] = [];
  certificates: InMemoryCertificate[] = [];
  refreshTokens: InMemoryRefreshToken[] = [];
  sessions: InMemorySession[] = [];
  installHistories: InMemoryInstallHistory[] = [];
  databases: InMemoryDatabaseInstance[] = [];
  emailVerificationTokens: any[] = [];
  passwordResetTokens: any[] = [];
  loginHistories: any[] = [];

  constructor() {
    this.seedDefaults().then(() => {
      this.load();
    });
  }

  load() {
    const cacheDir = path.join(process.cwd(), 'cache');
    const dbFile = path.join(cacheDir, 'inMemoryDb.json');
    try {
      if (fs.existsSync(dbFile)) {
        const raw = fs.readFileSync(dbFile, 'utf8');
        const data = JSON.parse(raw);
        if (data.sites) {
          this.sites = data.sites.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          }));
        }
        if (data.domains) {
          this.domains = data.domains.map((d: any) => ({
            ...d,
            createdAt: new Date(d.createdAt),
            updatedAt: new Date(d.updatedAt),
          }));
        }
        if (data.databases) {
          this.databases = data.databases.map((db: any) => ({
            ...db,
            createdAt: new Date(db.createdAt),
          }));
        }
        if (data.installHistories) {
          this.installHistories = data.installHistories.map((h: any) => ({
            ...h,
            createdAt: new Date(h.createdAt),
          }));
        }
        if (data.users && data.users.length > 0) {
          this.users = data.users.map((u: any) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          }));
        }
      }
    } catch (e) {
      // ignore
    }
  }

  save() {
    const cacheDir = path.join(process.cwd(), 'cache');
    const dbFile = path.join(cacheDir, 'inMemoryDb.json');
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(
        dbFile,
        JSON.stringify(
          {
            users: this.users,
            sites: this.sites,
            domains: this.domains,
            databases: this.databases,
            installHistories: this.installHistories,
          },
          null,
          2,
        ),
      );
    } catch (e) {
      // ignore
    }
  }

  private async seedDefaults() {
    const passwordHash = await hashPassword('SecurePassword1!');

    // Seed default test user login@wphub.cloud
    this.users.push({
      id: 'usr-default-seed-1',
      email: 'login@wphub.cloud',
      passwordHash,
      role: Role.USER,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        id: 'prof-default-seed-1',
        userId: 'usr-default-seed-1',
        firstName: 'WPHub',
        lastName: 'Tester',
        avatarUrl: null,
      },
      settings: {
        id: 'sett-default-seed-1',
        userId: 'usr-default-seed-1',
        twoFactorEnabled: false,
      },
      preferences: {
        id: 'pref-default-seed-1',
        userId: 'usr-default-seed-1',
        theme: 'dark',
        notificationsEnabled: true,
      },
    });

    // Seed default test user async@mail.com
    this.users.push({
      id: 'usr-default-seed-2',
      email: 'async@mail.com',
      passwordHash,
      role: Role.USER,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        id: 'prof-default-seed-2',
        userId: 'usr-default-seed-2',
        firstName: 'Async',
        lastName: 'Tester',
        avatarUrl: null,
      },
      settings: {
        id: 'sett-default-seed-2',
        userId: 'usr-default-seed-2',
        twoFactorEnabled: false,
      },
      preferences: {
        id: 'pref-default-seed-2',
        userId: 'usr-default-seed-2',
        theme: 'dark',
        notificationsEnabled: true,
      },
    });
  }
}

export const inMemoryDb = new InMemoryDatabase();

export function saveInMemoryDb() {
  inMemoryDb.save();
}
