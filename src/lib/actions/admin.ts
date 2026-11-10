"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { login, logout, requireAdmin } from "@/lib/auth";
import { db, ensureSchema, schema } from "@/lib/db";
import { syncOrder } from "@/lib/mercado-pago";
import { fetchProduct } from "@/lib/product-page";
import { secureImage } from "@/lib/utils";

const { gifts, giftOrders } = schema;

export async function loginAction(_: unknown, formData: FormData) {
  const ok = await login(String(formData.get("password") ?? ""));
  if (!ok) return { error: "Senha incorreta." };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin");
}

/* ───────────── Presentes ───────────── */

const giftSchema = z.object({
  id: z.coerce.number().int().optional(),
  list: z.enum(["casamento", "cha"]),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(500).optional(),
  price: z.string().trim().min(1),
  imageUrl: z.string().trim().max(2000).optional(),
  /** JSON com a lista de fotos, montado pelo formulário */
  images: z.string().max(40_000).optional(),
  productUrl: z.string().trim().max(2000).optional(),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  sort: z.coerce.number().int().default(0),
  active: z.string().optional(),
});

export async function saveGift(formData: FormData) {
  await requireAdmin();
  await ensureSchema();
  const data = giftSchema.parse(Object.fromEntries([...formData.entries()].filter(([, v]) => v !== "")));
  const priceCents = parsePrice(data.price);
  if (!Number.isFinite(priceCents) || priceCents <= 0) throw new Error("Preço inválido");

  const images = parseImages(data.images);
  if (data.imageUrl && !images.includes(data.imageUrl)) images.unshift(data.imageUrl);

  const values = {
    list: data.list,
    title: data.title,
    description: data.description ?? null,
    priceCents,
    imageUrl: images[0] ?? null,
    images,
    productUrl: data.productUrl ?? null,
    quantity: data.quantity,
    sort: data.sort,
    active: data.active === "on",
  };
  if (data.id) await db.update(gifts).set(values).where(eq(gifts.id, data.id));
  else await db.insert(gifts).values(values);
  updateTag("gifts");
}

/** Só URLs http(s), sem repetir, no máximo 15 */
function parseImages(raw?: string) {
  let list: unknown = [];
  try {
    list = JSON.parse(raw ?? "[]");
  } catch {
    /* ignora */
  }
  if (!Array.isArray(list)) return [];
  return [
    ...new Set(list.filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u) && u.length < 2000).map(secureImage)),
  ].slice(0, 15);
}

/** Busca nome, preço e fotos a partir do link do produto */
export async function fetchProductInfo(url: string) {
  await requireAdmin();
  try {
    return { ok: true as const, ...(await fetchProduct(url.trim())) };
  } catch {
    return { ok: false as const, error: "Não consegui abrir esse link." };
  }
}

const parsePrice = (raw: string) => Math.round(Number(raw.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) * 100);

export async function setGiftActive(id: number, active: boolean) {
  await requireAdmin();
  await db.update(gifts).set({ active }).where(eq(gifts.id, id));
  updateTag("gifts");
}

/** Cria uma cópia oculta, para ajustar e publicar */
export async function duplicateGift(id: number) {
  await requireAdmin();
  const [g] = await db.select().from(gifts).where(eq(gifts.id, id));
  if (!g) return;
  await db.insert(gifts).values({
    list: g.list,
    title: `${g.title} (cópia)`,
    description: g.description,
    priceCents: g.priceCents,
    imageUrl: g.imageUrl,
    images: g.images,
    productUrl: g.productUrl,
    quantity: g.quantity,
    sort: g.sort,
    active: false,
  });
  updateTag("gifts");
}

/**
 * Vários presentes de uma vez — uma linha por presente:
 * `Título ; valor ; link da imagem (opcional) ; descrição (opcional)`
 */
export async function importGifts(list: "casamento" | "cha", raw: string) {
  await requireAdmin();
  await ensureSchema();
  const rows = raw
    .split(/\r?\n/)
    .map((l) => l.split(/[;\t]/).map((c) => c.trim()))
    .filter(([title, price]) => title && price)
    .map(([title, price, imageUrl, description]) => ({
      list,
      title: title.slice(0, 140),
      priceCents: parsePrice(price),
      imageUrl: imageUrl || null,
      images: imageUrl ? [imageUrl] : null,
      description: description || null,
    }))
    .filter((r) => Number.isFinite(r.priceCents) && r.priceCents > 0);
  if (rows.length) await db.insert(gifts).values(rows);
  updateTag("gifts");
  return { created: rows.length };
}

export async function deleteGift(id: number) {
  await requireAdmin();
  await db.delete(giftOrders).where(eq(giftOrders.giftId, id));
  await db.delete(gifts).where(eq(gifts.id, id));
  updateTag("gifts");
}

export async function setOrderStatus(id: number, status: "pending" | "paid" | "cancelled") {
  await requireAdmin();
  await db.update(giftOrders).set({ status }).where(eq(giftOrders.id, id));
  updateTag("gifts");
}

/** Consulta no Mercado Pago todos os pedidos ainda "aguardando" */
export async function refreshPendingOrders() {
  await requireAdmin();
  const pending = await db.select({ id: giftOrders.id }).from(giftOrders).where(eq(giftOrders.status, "pending"));
  let updated = 0;
  for (const o of pending) {
    const r = await syncOrder(o.id).catch(() => null);
    if (r && r.status !== "pending") updated++;
  }
  updateTag("gifts");
  return { checked: pending.length, updated };
}
