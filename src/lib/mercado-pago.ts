import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { coupleNames, wedding } from "./config";
import { db, ensureSchema, schema } from "./db";

/**
 * Mercado Pago — Checkout Pro via API REST (sem SDK).
 *
 * Variáveis:
 *  - MP_ACCESS_TOKEN    credencial da aplicação ("TEST-..." no modo teste, "APP_USR-..." em produção)
 *  - MP_WEBHOOK_SECRET  assinatura secreta das notificações (Suas integrações → Webhooks)
 *
 * Fluxo: createGiftOrder cria o pedido e a "preference" → convidado paga no Mercado Pago →
 * volta para /presentes/obrigado e/ou o webhook avisa → syncPayment busca o pagamento na API
 * (nunca confiamos no que vem na URL) e atualiza o pedido.
 */

const API = "https://api.mercadopago.com";
const token = () => process.env.MP_ACCESS_TOKEN?.trim() ?? "";

export const mpConfigured = () => token().length > 0;
const isTest = () => token().startsWith("TEST-");

async function mp<T>(path: string, init?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token()}`,
      "content-type": "application/json",
      accept: "application/json",
      // sem isso a proteção do Mercado Pago recusa (403) chamadas vindas de servidores na nuvem
      "user-agent": `site-casamento/1.0 (+${wedding.siteUrl})`,
      ...(init?.idempotencyKey ? { "x-idempotency-key": init.idempotencyKey } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    const hints = ["x-request-id", "server", "cf-ray"].map((h) => `${h}=${res.headers.get(h) ?? "-"}`).join(" ");
    throw new Error(`Mercado Pago ${res.status} em ${path}: ${body || "(sem corpo)"} [${hints}]`);
  }
  return res.json() as Promise<T>;
}

type Preference = { id: string; init_point: string; sandbox_init_point: string };

/** Cria o link de pagamento de um pedido e devolve a URL do checkout */
export async function createCheckout(order: { id: number; title: string; amountCents: number; buyerName: string; list: "casamento" | "cha" }) {
  const site = wedding.siteUrl.replace(/\/$/, "");
  const https = site.startsWith("https://");
  const back = `${site}/presentes/obrigado`;

  const pref = await mp<Preference>("/checkout/preferences", {
    method: "POST",
    idempotencyKey: `gift-order-${order.id}`,
    body: JSON.stringify({
      items: [
        {
          id: String(order.id),
          title: order.title.slice(0, 250),
          description: order.list === "cha" ? `Chá de panela — ${coupleNames}` : `Lista de presentes — ${coupleNames}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: order.amountCents / 100,
        },
      ],
      payer: { name: order.buyerName },
      external_reference: String(order.id),
      // cartão de crédito em até 12x (juros por conta de quem paga, conforme a conta Mercado Pago)
      payment_methods: { installments: 12 },
      // nome na fatura do cartão (até 22 letras, sem acento)
      statement_descriptor: coupleNames
        .replace("&", "E")
        .normalize("NFD")
        .replace(/[^A-Za-z0-9 ]/g, "")
        .toUpperCase()
        .slice(0, 22),
      back_urls: { success: back, pending: back, failure: back },
      // o Mercado Pago só aceita retorno automático e webhook em endereço público (https)
      ...(https ? { auto_return: "approved", notification_url: `${site}/api/mercado-pago/webhook` } : {}),
      metadata: { order_id: order.id, list: order.list },
    }),
  });

  await db.update(schema.giftOrders).set({ mpPreferenceId: pref.id }).where(eq(schema.giftOrders.id, order.id));
  return isTest() ? pref.sandbox_init_point : pref.init_point;
}

type Payment = { id: number; status: string; status_detail: string; external_reference: string | null; transaction_amount: number };

const STATUS: Record<string, "paid" | "pending" | "cancelled"> = {
  approved: "paid",
  authorized: "pending",
  pending: "pending",
  in_process: "pending",
  in_mediation: "pending",
  rejected: "cancelled",
  cancelled: "cancelled",
  refunded: "cancelled",
  charged_back: "cancelled",
};

/** Busca o pagamento no Mercado Pago e atualiza o pedido correspondente */
export async function syncPayment(paymentId: string) {
  if (!mpConfigured() || !/^\d+$/.test(paymentId)) return null;
  await ensureSchema();
  const pay = await mp<Payment>(`/v1/payments/${paymentId}`);
  const orderId = Number(pay.external_reference);
  if (!orderId) return null;

  const [order] = await db.select().from(schema.giftOrders).where(eq(schema.giftOrders.id, orderId));
  if (!order) return null;

  const status = STATUS[pay.status] ?? "pending";
  // um pagamento recusado não derruba um pedido que já foi pago por outra tentativa
  if (!(order.status === "paid" && status !== "paid" && order.mpPaymentId !== String(pay.id))) {
    await db
      .update(schema.giftOrders)
      .set({ status, mpPaymentId: String(pay.id) })
      .where(eq(schema.giftOrders.id, orderId));
  }
  return { orderId, status, mpStatus: pay.status, detail: pay.status_detail };
}

/**
 * Confere o header x-signature das notificações (ts=...,v1=...).
 * Manifesto oficial: "id:{data.id};request-id:{x-request-id};ts:{ts};"
 */
export function verifySignature(headers: Headers, dataId: string) {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) return true; // sem segredo configurado, a segurança vem de sempre consultar a API
  const sig = headers.get("x-signature") ?? "";
  const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const requestId = headers.get("x-request-id");
  const manifest = `id:${dataId.toLowerCase()};${requestId ? `request-id:${requestId};` : ""}ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Procura os pagamentos de um pedido pelo external_reference (usado pelo botão do painel,
 * para pedidos em que o convidado não voltou ao site e o webhook não chegou).
 */
export async function syncOrder(orderId: number) {
  if (!mpConfigured()) return null;
  const { results } = await mp<{ results: Payment[] }>(
    `/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`,
  );
  if (!results.length) return null;
  const best = results.find((p) => p.status === "approved") ?? results[0];
  return syncPayment(String(best.id));
}
