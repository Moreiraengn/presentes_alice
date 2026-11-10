import { mpConfigured, syncPayment, verifySignature } from "@/lib/mercado-pago";

/**
 * Notificações do Mercado Pago (configurado automaticamente em cada pagamento via notification_url).
 * Responde 200 rápido; o status real sempre vem da API, nunca do corpo da notificação.
 */
export async function POST(request: Request) {
  if (!mpConfigured()) return Response.json({ ok: false }, { status: 503 });

  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  if (type !== "payment" || !id) return Response.json({ ok: true, ignored: true });
  if (!verifySignature(request.headers, id)) return Response.json({ ok: false, error: "assinatura inválida" }, { status: 401 });

  try {
    const result = await syncPayment(id);
    return Response.json({ ok: true, result });
  } catch (err) {
    console.error("[mercado-pago] webhook", err);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return Response.json({ ok: false }, { status: 500 });
  }
}
