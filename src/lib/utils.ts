export { clsx as cn } from "clsx";

/** "João Pedro" -> "joao pedro": usado na busca do painel */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "1.299,90", "1299.90" ou 1299.9 → centavos (null se não der) */
export const toCents = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  let s = String(v).replace(/[^\d,.]/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // "1.299" = mil duzentos e noventa e nove
  // "1.299,90" → 1299.90 ; "1299.90" → 1299.90
  const n = /,\d{1,2}$/.test(s) ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

/** Foto de loja: usa sempre https (algumas lojas entregam o link com http://) */
export const secureImage = (url: string) => url.trim().replace(/^http:\/\//i, "https://");
