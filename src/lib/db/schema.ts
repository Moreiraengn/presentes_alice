import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const gifts = sqliteTable("gifts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** "casamento" = /presentes · "cha" = /cha-de-panela */
  list: text("list", { enum: ["casamento", "cha"] }).notNull().default("casamento"),
  title: text("title").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  imageUrl: text("image_url"),
  /** todas as fotos (a primeira é a capa, igual a imageUrl) */
  images: text("images", { mode: "json" }).$type<string[]>(),
  /** link do produto na loja (só aparece no painel) */
  productUrl: text("product_url"),
  /** quantas vezes pode ser presenteado (cotas) */
  quantity: integer("quantity").notNull().default(1),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
});

/** Cada "presentear" vira um pedido. O Mercado Pago confirma o pagamento (retorno + webhook). */
export const giftOrders = sqliteTable("gift_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  giftId: integer("gift_id")
    .notNull()
    .references(() => gifts.id, { onDelete: "cascade" }),
  buyerName: text("buyer_name").notNull(),
  message: text("message"),
  amountCents: integer("amount_cents").notNull(),
  status: text("status", { enum: ["pending", "paid", "cancelled"] })
    .notNull()
    .default("pending"),
  mpPreferenceId: text("mp_preference_id"),
  mpPaymentId: text("mp_payment_id"),
  createdAt: createdAt(),
});

export type Gift = typeof gifts.$inferSelect;
export type GiftOrder = typeof giftOrders.$inferSelect;
export type GiftList = Gift["list"];
