import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Supabase pooler (transaction mode) needs prepare:false. The timeouts drop
// idle connections before the network silently does: a query on a stale
// connection otherwise hangs until the TCP read times out, which showed up
// as a dashboard that never finished loading after the server sat idle.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
