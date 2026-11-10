import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, ensureSchema, schema } from "./db";
import type { GiftList } from "./db/schema";
import { secureImage } from "./utils";

const { gifts, giftOrders } = schema;

export type PublicGift = {
  id: number;
  title: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  images: string[];
  remaining: number;
};

/** Catálogo da lista (nome, fotos, preço): muda pouco, fica em cache até o painel editar. */
async function getCatalog(list: GiftList) {
  "use cache";
  cacheLife("minutes");
  cacheTag("gifts");
  await ensureSchema();

  const rows = await db
    .select({
      id: gifts.id,
      title: gifts.title,
      description: gifts.description,
      priceCents: gifts.priceCents,
      imageUrl: gifts.imageUrl,
      images: gifts.images,
      quantity: gifts.quantity,
    })
    .from(gifts)
    .where(and(eq(gifts.list, list), eq(gifts.active, true)))
    .orderBy(asc(gifts.sort), asc(gifts.priceCents));

  return rows.map(({ images, ...g }) => ({
    ...g,
    imageUrl: g.imageUrl ? secureImage(g.imageUrl) : null,
    images: (images?.length ? images : g.imageUrl ? [g.imageUrl] : []).map(secureImage),
  }));
}

/**
 * Lista pública: o catálogo em cache + quantas cotas já foram pagas, sempre na hora
 * (sem cache), assim um presente pago some da lista no mesmo instante.
 */
export async function getGifts(list: GiftList): Promise<PublicGift[]> {
  const catalog = await getCatalog(list);
  if (!catalog.length) return [];
  const paid = await db
    .select({ giftId: giftOrders.giftId, n: sql<number>`count(*)` })
    .from(giftOrders)
    .where(and(eq(giftOrders.status, "paid"), inArray(giftOrders.giftId, catalog.map((g) => g.id))))
    .groupBy(giftOrders.giftId);
  const taken = new Map(paid.map((p) => [p.giftId, Number(p.n)]));

  return catalog
    .map(({ quantity, ...g }) => ({ ...g, remaining: Math.max(0, quantity - (taken.get(g.id) ?? 0)) }))
    .filter((g) => g.remaining > 0); // já presenteado sai da lista
}

/** Todos os presentes (inclusive ocultos), com quantas cotas já foram pagas */
export async function getAllGifts() {
  await ensureSchema();
  const rows = await db
    .select({
      gift: gifts,
      taken: sql<number>`(select count(*) from ${giftOrders} where ${giftOrders.giftId} = ${gifts.id} and ${giftOrders.status} = 'paid')`,
    })
    .from(gifts)
    .orderBy(asc(gifts.list), asc(gifts.sort), asc(gifts.priceCents));
  return rows.map(({ gift, taken }) => ({ ...gift, taken: Number(taken) }));
}

export type AdminGift = Awaited<ReturnType<typeof getAllGifts>>[number];

export async function getOrders() {
  await ensureSchema();
  return db
    .select({
      id: giftOrders.id,
      buyerName: giftOrders.buyerName,
      message: giftOrders.message,
      amountCents: giftOrders.amountCents,
      status: giftOrders.status,
      createdAt: giftOrders.createdAt,
      giftTitle: gifts.title,
      list: gifts.list,
    })
    .from(giftOrders)
    .innerJoin(gifts, eq(gifts.id, giftOrders.giftId))
    .orderBy(desc(giftOrders.createdAt));
}

export async function getStats() {
  await ensureSchema();
  const [o] = await db
    .select({
      paid: sql<number>`coalesce(sum(case when ${giftOrders.status} = 'paid' then ${giftOrders.amountCents} else 0 end), 0)`,
      count: sql<number>`sum(case when ${giftOrders.status} = 'paid' then 1 else 0 end)`,
    })
    .from(giftOrders);
  return { paidCents: Number(o?.paid ?? 0), paidCount: Number(o?.count ?? 0) };
}
