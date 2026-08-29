import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { sslConfig } from './ssl';

const DATABASE_URL = process.env['DATABASE_URL'] || '';

export const IS_DATABASE_CONFIGURED = Boolean(DATABASE_URL) && !DATABASE_URL.includes('replace_me');

let pool: Pool | null = null;

function getPool(): Pool {
  if (!IS_DATABASE_CONFIGURED) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: sslConfig(DATABASE_URL),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    pool.on('error', err => {
      console.error('[makini] Unexpected Postgres pool error:', err);
    });
  }

  return pool;
}

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let database: Database | null = null;

export function getDb(): Database {
  if (!database) {
    database = drizzle(getPool(), { schema });
  }

  return database;
}
