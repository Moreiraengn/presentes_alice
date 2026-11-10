/** Tabelas criadas sozinhas no primeiro acesso (idempotente: pode rodar quantas vezes quiser). */
export const MIGRATION = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list TEXT NOT NULL DEFAULT 'casamento',
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS gift_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  message TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS gift_orders_gift_idx ON gift_orders(gift_id);
`;

/**
 * Colunas adicionadas depois da primeira versão. SQLite não tem "ADD COLUMN IF NOT EXISTS",
 * então cada uma roda separada e o erro de "coluna já existe" é ignorado.
 * (Mantidas assim para o módulo também funcionar num banco que já tinha as tabelas do site completo.)
 */
export const ADD_COLUMNS = [
  // fotos do presente (JSON com a lista de URLs; a primeira é a capa) e o link da loja
  "ALTER TABLE gifts ADD COLUMN images TEXT",
  "ALTER TABLE gifts ADD COLUMN product_url TEXT",
];

type Executor = { executeMultiple(sql: string): Promise<void>; execute(sql: string): Promise<unknown> };

export async function applyMigrations(client: Executor) {
  await client.executeMultiple(MIGRATION);
  for (const sql of ADD_COLUMNS) {
    await client.execute(sql).catch((err: Error) => {
      if (!/duplicate column/i.test(err.message)) throw err;
    });
  }
}
