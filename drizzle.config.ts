import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { sslConfig } from './src/server/db/ssl';

const url = process.env['DATABASE_URL'] || '';

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: url || 'postgresql://localhost:5432/makini',
    ssl: url ? sslConfig(url) : false,
  },
});
