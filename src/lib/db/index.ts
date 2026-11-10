import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { ADD_COLUMNS, applyMigrations } from "./migration";

/**
 * Local: arquivo SQLite (`file:local.db`), zero configuração.
 * Produção (Vercel): Turso — a integração da Vercel cria TURSO_DATABASE_URL e TURSO_AUTH_TOKEN
 * (DATABASE_URL / DATABASE_AUTH_TOKEN também funcionam).
 */
const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

const globalForDb = globalThis as unknown as { libsql?: Client; schemaReady?: Promise<void>; schemaVersion?: number };

const client = globalForDb.libsql ?? createClient({ url, authToken });
if (process.env.NODE_ENV !== "production") globalForDb.libsql = client;

export const db = drizzle(client, { schema });

/** Cria as tabelas na primeira chamada (idempotente). */
export function ensureSchema() {
  // em dev o servidor fica ligado entre mudanças: se surgir coluna nova, roda de novo
  if (globalForDb.schemaVersion !== ADD_COLUMNS.length) {
    globalForDb.schemaReady = undefined;
    globalForDb.schemaVersion = ADD_COLUMNS.length;
  }
  globalForDb.schemaReady ??= applyMigrations(client).catch((err) => {
    globalForDb.schemaReady = undefined;
    throw err;
  });
  return globalForDb.schemaReady;
}

export { schema };
