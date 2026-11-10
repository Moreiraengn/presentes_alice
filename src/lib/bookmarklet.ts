/**
 * Botão "Capturar presente" para a barra de favoritos.
 * Roda na página do produto (no navegador dos noivos, então as lojas não bloqueiam),
 * junta nome, preço e fotos e abre o painel com o presente já preenchido.
 *
 * Escrito em JS "antigo" de propósito: vira uma linha só dentro de um favorito.
 */
function capture(origin: string) {
  const imgs: string[] = [];
  const add = (u: unknown) => {
    if (typeof u !== "string" || !u) return;
    let url: string;
    try {
      url = new URL(u, location.href).href;
    } catch {
      return;
    }
    // versões grandes das fotos nas lojas mais comuns
    url = url
      .replace(/^http:\/\//i, "https://")
      .replace(/\._[^/]*_\.(jpe?g|png|webp)$/i, ".$1") // Amazon: ..._AC_SX300_.jpg → .jpg
      .replace(/-[A-Z]\.(webp|jpe?g|png)$/i, "-O.$1") // Mercado Livre: -V.webp → -O.webp
      .replace(/\/\d{2,4}x\d{2,4}\//, "/1500x1500/"); // Magalu
    if (/^https?:/.test(url) && !/\.svg(\?|$)/i.test(url) && imgs.indexOf(url) < 0) imgs.push(url);
  };

  let title: unknown = null;
  let price: unknown = null;
  let desc: unknown = null;
  const walk = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const o = n as Record<string, unknown>;
    const t = o["@type"];
    if (t === "Product" || (Array.isArray(t) && t.indexOf("Product") >= 0)) {
      title = title || o.name;
      desc = desc || o.description;
      const im = o.image;
      (Array.isArray(im) ? im : [im]).forEach((x) => add(typeof x === "string" ? x : (x as { url?: string } | null)?.url));
      const offers = o.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
      const offer = Array.isArray(offers) ? offers[0] : offers;
      if (offer && !price) price = offer.price || offer.lowPrice;
    }
    if (o["@graph"]) walk(o["@graph"]);
  };
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      walk(JSON.parse(s.textContent || ""));
    } catch {
      /* ignora */
    }
  });

  const meta = (k: string) =>
    document.querySelector<HTMLMetaElement>(`meta[property="${k}"],meta[name="${k}"],meta[itemprop="${k}"]`)?.content;
  title = title || meta("og:title") || document.title;
  price = price || meta("product:price:amount") || meta("og:price:amount") || meta("price");
  desc = desc || meta("og:description") || meta("description");
  // texto corrido e curto (cabe no card e na URL)
  let d = String(desc || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (d.length > 240) {
    const cut = d.slice(0, 240);
    const stop = cut.lastIndexOf(". ");
    d = stop > 80 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(" ")) + "…";
  }

  document.querySelectorAll<HTMLMetaElement>('meta[property="og:image"]').forEach((e) => add(e.content));
  // galerias: atributos de zoom/alta resolução usados por várias lojas
  document.querySelectorAll<HTMLElement>("[data-old-hires],[data-zoom],[data-zoom-image],[data-large-image]").forEach((e) => {
    add(e.getAttribute("data-old-hires") || e.getAttribute("data-zoom") || e.getAttribute("data-zoom-image") || e.getAttribute("data-large-image"));
  });
  (document.documentElement.innerHTML.match(/"hiRes":"(https:[^"]+)"/g) || []).forEach((m) => add(m.slice(9, -1)));
  // por último, as maiores imagens visíveis na página
  Array.prototype.slice
    .call(document.images)
    .filter((i: HTMLImageElement) => i.naturalWidth >= 300 && i.naturalHeight >= 300)
    .sort((a: HTMLImageElement, b: HTMLImageElement) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)
    .slice(0, 12)
    .forEach((i: HTMLImageElement) => add(i.currentSrc || i.src));

  const data = { t: String(title || "").trim().slice(0, 140), p: price ? String(price) : "", d, i: imgs.slice(0, 15), u: location.href };
  window.open(`${origin}/admin?capturar=${encodeURIComponent(JSON.stringify(data))}`, "_blank");
}

/** O `href` do favorito, apontando para o painel deste site */
export const bookmarkletHref = (origin: string) =>
  `javascript:${encodeURIComponent(`(${capture.toString()})(${JSON.stringify(origin)});void 0`)}`;

export type Captured = { t: string; p: string; d?: string; i: string[]; u: string };
