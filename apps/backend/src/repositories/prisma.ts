import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// In-Memory Mode flag: switched to true if postgres connection fails
export let isDbOffline = false;

export async function checkDbConnection() {
  try {
    // Run simple query validation
    await prisma.$queryRaw`SELECT 1`;
    isDbOffline = false;
    console.log(
      '[DATABASE] PostgreSQL database connection successful. Running in PostgreSQL Mode.',
    );
  } catch (err) {
    isDbOffline = true;
    console.warn('[DATABASE] PostgreSQL database is OFFLINE. Switching to WPHub IN-MEMORY mode.');
  }
}

// Allow programmatically overriding offline state for unit testing
export function setDbOffline(state: boolean) {
  isDbOffline = state;
}
