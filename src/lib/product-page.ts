import "server-only";
import { secureImage, toCents } from "./utils";

/**
 * Lê a página de um produto e tenta tirar nome, preço e fotos
 * (JSON-LD de Product, Open Graph e meta tags de preço).
 * Lojas grandes (Amazon, Magalu, Mercado Livre) bloqueiam robôs — para elas existe o
 * botão "Capturar presente" no painel, que roda no navegador dos noivos.
 */

export type ProductInfo = { title: string | null; priceCents: number | null; description: string | null; images: string[] };

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

function metas(html: string, key: string) {
  const out: string[] = [];
  const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*>`, "gi");
  for (const tag of html.match(re) ?? []) {
    const m = tag.match(/content=["']([^"']+)["']/i);
    if (m) out.push(decode(m[1]));
  }
  return out;
}

type Json = Record<string, unknown>;

/** Acha objetos @type Product dentro dos blocos JSON-LD (inclusive dentro de @graph) */
function ldProducts(html: string): Json[] {
  const found: Json[] = [];
  const visit = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visit);
    if (!n || typeof n !== "object") return;
    const o = n as Json;
    const t = o["@type"];
    if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) found.push(o);
    if (o["@graph"]) visit(o["@graph"]);
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(m[1].trim()));
    } catch {
      /* JSON-LD quebrado: ignora */
    }
  }
  return found;
}

const asList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.flatMap(asList)
    : typeof v === "string"
      ? [v]
      : v && typeof v === "object" && typeof (v as Json).url === "string"
        ? [(v as Json).url as string]
        : [];

/** Até ~240 caracteres, terminando numa frase ou palavra inteira */
export function shorten(text: string, max = 240) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return stop > 80 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function parseProduct(html: string, baseUrl: string): ProductInfo {
  const product = ldProducts(html)[0];
  const offers = product?.offers as Json | Json[] | undefined;
  const offer = (Array.isArray(offers) ? offers[0] : offers) as Json | undefined;

  const title = (product?.name as string | undefined) ?? metas(html, "og:title")[0] ?? html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null;
  const price =
    toCents(offer?.price ?? offer?.lowPrice) ??
    toCents(metas(html, "product:price:amount")[0]) ??
    toCents(metas(html, "og:price:amount")[0]) ??
    toCents(metas(html, "price")[0]);

  const raw = [...asList(product?.image), ...metas(html, "og:image"), ...metas(html, "og:image:secure_url"), ...metas(html, "twitter:image")];
  const images = [
    ...new Set(
      raw
        .map((u) => {
          try {
            return secureImage(new URL(decode(u), baseUrl).toString());
          } catch {
            return null;
          }
        })
        .filter((u): u is string => !!u && /^https?:/.test(u)),
    ),
  ].slice(0, 15);

  const rawDesc = (typeof product?.description === "string" ? product.description : null) ?? metas(html, "og:description")[0] ?? metas(html, "description")[0] ?? null;
  // texto corrido, sem HTML, cortado numa frase para caber no card
  const description = rawDesc ? shorten(decode(rawDesc.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ")) : null;

  return { title: title ? decode(title).slice(0, 140) : null, priceCents: price, description, images };
}

/** Bloqueia endereços internos — o link vem do painel, mas não custa nada */
function isPublicUrl(u: URL) {
  if (!/^https?:$/.test(u.protocol)) return false;
  const h = u.hostname;
  return !(h === "localhost" || /^(127|10|0)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.endsWith(".local") || h.includes(":"));
}

export async function fetchProduct(url: string): Promise<ProductInfo & { blocked: boolean }> {
  const target = new URL(url);
  if (!isPublicUrl(target)) throw new Error("Link inválido.");
  const res = await fetch(target, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "accept-language": "pt-BR,pt;q=0.9",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) return { title: null, priceCents: null, description: null, images: [], blocked: true };
  const html = (await res.text()).slice(0, 3_000_000);
  const info = parseProduct(html, res.url || url);
  return { ...info, blocked: !info.images.length && !info.title };
}
