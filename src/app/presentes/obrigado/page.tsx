import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { Footer } from "@/components/footer";
import { Reveal } from "@/components/reveal";
import { Branch } from "@/components/ornament";
import { coupleNames, mainSite } from "@/lib/config";
import { db, schema } from "@/lib/db";
import { syncPayment } from "@/lib/mercado-pago";

export const metadata: Metadata = {
  title: "Obrigado pelo presente",
  robots: { index: false, follow: false },
};

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

const COPY = {
  paid: {
    title: "Muito obrigado!",
    text: "Seu presente chegou até nós e já está guardado no coração. Mal podemos esperar para celebrar com você!",
  },
  pending: {
    title: "Quase lá…",
    text: "Seu pagamento está sendo processado pelo Mercado Pago. Assim que for confirmado, ele aparece para nós — não precisa fazer mais nada.",
  },
  cancelled: {
    title: "Ops…",
    text: "O pagamento não foi concluído e nada foi cobrado. Se quiser, é só tentar de novo pela lista.",
  },
} as const;

/** Volta do Mercado Pago: confere o pagamento na API (não confia na URL) e agradece */
async function Result({ searchParams }: { searchParams: Search }) {
  // consulta o Mercado Pago só quando o convidado abre a página (nunca no pré-render)
  await connection();
  const sp = await searchParams;
  const paymentId = String(sp.payment_id ?? sp.collection_id ?? "");
  const result = await syncPayment(paymentId).catch((err) => {
    console.error("[mercado-pago] retorno", err);
    return null;
  });

  const status = result?.status ?? (sp.status === "approved" ? "pending" : sp.status ? "cancelled" : "pending");
  let list: "casamento" | "cha" = "casamento";
  if (result?.orderId) {
    const [row] = await db
      .select({ list: schema.gifts.list })
      .from(schema.giftOrders)
      .innerJoin(schema.gifts, eq(schema.gifts.id, schema.giftOrders.giftId))
      .where(eq(schema.giftOrders.id, result.orderId));
    if (row) list = row.list;
  }
  const back = list === "cha" ? "/cha-de-panela" : "/presentes";
  const copy = COPY[status];

  return (
    <Reveal className="relative w-full max-w-md">
      <div className="arch-frame bg-paper">
        <div className="flex aspect-[3/4] flex-col items-center justify-center px-10 text-center">
          <h1 className="font-serif text-[clamp(2rem,4vw,2.6rem)] italic leading-tight text-primary">{copy.title}</h1>
          <p className="mt-6 text-[1rem] leading-relaxed tracking-[0.03em] text-muted">{copy.text}</p>
          <Branch className="mt-8 w-20 text-line" />
          <p className="mt-4 font-serif text-[1.05rem] italic text-muted">com amor,</p>
          <p className="eyebrow mt-2 text-primary">{coupleNames}</p>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center gap-3">
        <Link href={back} className="btn btn-ghost bg-paper">
          {status === "cancelled" ? "Tentar de novo" : "Voltar para a lista"}
        </Link>
        {mainSite && (
          <a href={mainSite.url} className="eyebrow text-[0.6rem] text-primary hover:underline">
            {mainSite.label}
          </a>
        )}
      </div>
    </Reveal>
  );
}

export default function ThanksPage({ searchParams }: { searchParams: Search }) {
  return (
    <>
      <main className="relative flex min-h-[calc(100dvh-72px)] items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-mist" aria-hidden />
        <Branch className="absolute -left-8 top-[22%] w-64 rotate-[-20deg] text-line/60" />
        <Branch flip className="absolute -right-8 bottom-[18%] w-64 rotate-[20deg] text-line/60" />
        <Suspense fallback={<p className="relative caps text-[0.8rem]">Conferindo o pagamento…</p>}>
          <Result searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
