import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const url = process.env.DATABASE_URL || '';

if (!url || url.includes('replace_me')) {
  console.error(
    'DATABASE_URL is not set. Add the Render Postgres External URL to .env, then retry.',
  );
  process.exit(1);
}

function shouldUseSsl(connectionString) {
  if (/sslmode=(disable|off)/.test(connectionString)) return false;
  if (/sslmode=/.test(connectionString)) return true;
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])/.test(connectionString);
  const isRenderInternal =
    /@[^/]*\.internal[:/]/.test(connectionString) || !connectionString.includes('.');
  return !isLocal && !isRenderInternal;
}

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');
const pool = new Pool({
  connectionString: url,
  ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 20_000,
});

try {
  await migrate(drizzle(pool), { migrationsFolder });
  console.log('Migrations applied.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await pool.end();
}
