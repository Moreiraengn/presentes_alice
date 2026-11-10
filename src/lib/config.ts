/**
 * ════════════════════════════════════════════════════════════════════
 *  CONFIGURAÇÃO DA LISTA DE PRESENTES: troque o que tem ✏️.
 *  Cores e fontes ficam em src/app/globals.css e src/app/layout.tsx.
 * ════════════════════════════════════════════════════════════════════
 */

/** ✏️ Quem está casando (aparece no topo, no rodapé, no Mercado Pago e na fatura do cartão) */
const couple = {
  bride: "Alice",
  groom: "Gabriel",
};

/** ✏️ Data do casamento, só para mostrar no rodapé (null = não mostra) */
const dateISO: string | null = "2027-10-16T16:00:00-03:00";

/**
 * ✏️ Site principal do casal (Wix, WordPress, outro Next.js…).
 * Vira o link "Voltar para o site" no topo e na tela de obrigado. null = esconde.
 */
export const mainSite: { url: string; label: string } | null = {
  url: "https://seu-site-de-casamento.com.br",
  label: "Voltar para o site",
};

/** ✏️ Títulos das listas (aparecem dos dois lados da ilustração, quando houver) */
export const listCopy = {
  casamento: { before: "Nossa lista", after: "de presentes" },
  cha: { before: "Nosso chá", after: "de panela" },
};

/**
 * ✏️ Ilustração animada opcional ao lado do título (vídeo curto, fundo branco, em /public/media).
 * Ex.: { webm: "/media/presente.webm", mp4: "/media/presente.mp4", poster: "/media/presente.jpg" }
 */
export const giftIllustration = null as { webm: string; mp4: string; poster: string } | null;

// ───────── daqui para baixo é calculado, não precisa mexer ─────────

const tz = "America/Sao_Paulo";
const when = dateISO ? new Date(dateISO) : null;
const part = (o: Intl.DateTimeFormatOptions) => when!.toLocaleString("pt-BR", { timeZone: tz, ...o });

export const wedding = {
  ...couple,
  /** "16 · 10 · 2027" (ou null) */
  dateShort: when ? `${part({ day: "2-digit" })} · ${part({ month: "2-digit" })} · ${part({ year: "numeric" })}` : null,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** "Gabriel & Alice": usado em textos e no Mercado Pago */
export const coupleNames = `${wedding.groom} & ${wedding.bride}`;
