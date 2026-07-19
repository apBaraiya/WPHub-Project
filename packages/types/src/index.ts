export type Role = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'SUPPORT' | 'USER' | 'SUPERADMIN';

export interface User {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: string;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  scopes: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  profile?: UserProfile | null;
  preferences?: UserPreferences | null;
  accessToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

export interface WordPressSite {
  id: string;
  name: string;
  domain: string;
  status: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'DELETING';
  phpVersion: string;
  wpVersion: string;
  createdAt: string;
  updatedAt: string;
}
