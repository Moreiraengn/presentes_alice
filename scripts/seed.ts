/**
 * Popula o banco com presentes de EXEMPLO para visualizar a lista.
 * Uso: npm run db:seed   (APAGA presentes e pedidos e recria; não rode em produção com dados reais!)
 */
import { createClient } from "@libsql/client";
import { applyMigrations } from "../src/lib/db/migration";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN,
});

const gifts: [string, string, string | null, number, number][] = [
  // lista, título, descrição, valor (R$), cotas
  ["casamento", "Jogo de panelas inox", "Para os primeiros jantares a dois", 890, 1],
  ["casamento", "Jantar romântico na lua de mel", null, 350, 3],
  ["casamento", "Passeio de barco na lua de mel", "Cota da experiência", 250, 4],
  ["casamento", "Cafeteira espresso", null, 1290, 1],
  ["casamento", "Jogo de cama king 400 fios", null, 620, 1],
  ["casamento", "Ajuda com a passagem aérea", "Cota", 500, 6],
  ["casamento", "Aparelho de jantar 42 peças", null, 780, 1],
  ["casamento", "Air fryer", null, 540, 1],
  ["cha", "Kit potes herméticos", null, 160, 1],
  ["cha", "Tábua de corte de madeira", null, 90, 1],
  ["cha", "Jogo de facas", null, 280, 1],
  ["cha", "Forma de bolo + assadeiras", null, 120, 1],
];

async function main() {
  await applyMigrations(db);
  await db.batch(["DELETE FROM gift_orders", "DELETE FROM gifts"], "write");

  for (const [i, [list, title, description, price, quantity]] of gifts.entries()) {
    await db.execute({
      sql: "INSERT INTO gifts (list, title, description, price_cents, quantity, sort) VALUES (?, ?, ?, ?, ?, ?)",
      args: [list, title, description, price * 100, quantity, i],
    });
  }

  console.log(`✓ ${gifts.length} presentes de exemplo`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
