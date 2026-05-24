import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: '../../infra/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/fokker_dev',
  },
  verbose: true,
  strict: true,
} satisfies Config;
