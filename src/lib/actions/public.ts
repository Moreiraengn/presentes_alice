"use server";

import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db, ensureSchema, schema } from "@/lib/db";
import { createCheckout, mpConfigured } from "@/lib/mercado-pago";

const { gifts, giftOrders } = schema;

const orderSchema = z.object({
  giftId: z.number().int().positive(),
  buyerName: z.string().trim().min(2).max(120),
  message: z.string().trim().max(600).optional(),
});

/**
 * Registra a intenção de presentear e, com o Mercado Pago configurado,
 * devolve o link do checkout para o convidado pagar (Pix, cartão, débito ou boleto).
 */
export async function createGiftOrder(input: z.input<typeof orderSchema>) {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Preencha seu nome para continuar." };
  await ensureSchema();

  const [gift] = await db.select().from(gifts).where(eq(gifts.id, parsed.data.giftId));
  if (!gift || !gift.active) return { ok: false as const, error: "Esse presente não está mais disponível." };

  const [{ paid }] = await db
    .select({ paid: count() })
    .from(giftOrders)
    .where(and(eq(giftOrders.giftId, gift.id), eq(giftOrders.status, "paid")));
  if (paid >= gift.quantity) return { ok: false as const, error: "Esse presente acabou de ser presenteado. Que tal escolher outro?" };

  const [order] = await db
    .insert(giftOrders)
    .values({ ...parsed.data, amountCents: gift.priceCents })
    .returning({ id: giftOrders.id });

  if (!mpConfigured()) return { ok: true as const, orderId: order.id, checkoutUrl: null as string | null };

  try {
    const checkoutUrl = await createCheckout({
      id: order.id,
      title: gift.title,
      amountCents: gift.priceCents,
      buyerName: parsed.data.buyerName,
      list: gift.list,
    });
    return { ok: true as const, orderId: order.id, checkoutUrl };
  } catch (err) {
    console.error("[mercado-pago] preference", err);
    await db.update(giftOrders).set({ status: "cancelled" }).where(eq(giftOrders.id, order.id));
    return { ok: false as const, error: "Não conseguimos abrir o pagamento agora. Tente de novo em instantes." };
  }
}
