import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Supabase pooler (transaction mode) needs prepare:false, and it stalls when
// several queries are pipelined onto one connection, which is what a page
// awaiting queries in parallel does. max_pipeline:1 sends one query per
// connection at a time (measured: 40 parallel queries in 0.7s instead of
// hanging for minutes). The timeouts drop idle connections before the
// network silently does, so no query waits on a dead connection.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max_pipeline: 1,
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
