"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  deleteGift,
  duplicateGift,
  fetchProductInfo,
  importGifts,
  logoutAction,
  refreshPendingOrders,
  saveGift,
  setGiftActive,
  setOrderStatus,
} from "@/lib/actions/admin";
import { mainSite, wedding } from "@/lib/config";
import type { AdminGift, getOrders, getStats } from "@/lib/data";
import { bookmarkletHref, type Captured } from "@/lib/bookmarklet";
import { brl, cn, normalize, toCents } from "@/lib/utils";

type Orders = Awaited<ReturnType<typeof getOrders>>;
type Stats = Awaited<ReturnType<typeof getStats>>;
type Tab = "presentes" | "pedidos";
type ListKey = AdminGift["list"];

/** ✏️ Nome das listas no painel (apague a linha do chá se o casal não for usar) */
const LISTS: [ListKey, string][] = [
  ["casamento", "Casamento"],
  ["cha", "Chá de panela"],
];

const ORDER_STATUS = {
  pending: { label: "Aguardando", cls: "bg-[#fff4d6] text-[#8a6400]" },
  paid: { label: "Pago", cls: "bg-[#e3f4e8] text-[#1d6b3a]" },
  cancelled: { label: "Cancelado", cls: "bg-cloud text-muted" },
} as const;

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });
  return [pending, run] as const;
}

/* ───────────── Peças de interface ───────────── */

const label = "mb-2 block text-[0.62rem] uppercase tracking-[0.22em] text-muted";
const input =
  "w-full rounded-lg border border-cloud bg-paper px-3.5 py-2.5 text-[0.95rem] text-ink outline-none transition focus:border-sage focus:ring-4 focus:ring-sage-soft/40";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[0.8rem] tracking-[0.08em] text-white transition hover:bg-primary-deep disabled:opacity-50";
const btnQuiet =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-cloud bg-paper px-3.5 py-2.5 text-[0.8rem] tracking-[0.06em] text-ink transition hover:border-sage hover:text-primary";

function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string, number?][];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([k, text, count]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[0.78rem] transition",
            value === k ? "bg-primary text-white" : "bg-paper text-muted hover:text-primary",
          )}
        >
          {text}
          {count !== undefined && <span className={cn("ml-1.5 text-[0.7rem]", value === k ? "text-sage-soft" : "text-faint")}>{count}</span>}
        </button>
      ))}
    </div>
  );
}

function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block min-w-0 flex-1 md:max-w-sm">
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14l4 4" strokeLinecap="round" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(input, "pl-9")} />
    </label>
  );
}

/** Painel lateral para formulários — não empurra a lista e funciona bem no celular */
function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-primary-night/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Fechar" />
          <motion.aside
            role="dialog"
            aria-modal
            aria-label={title}
           
            className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-[#f5f7fa] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-cloud bg-paper px-6 py-4">
              <h2 className="text-lg italic text-primary">{title}</h2>
              <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-ink" aria-label="Fechar">
                ×
              </button>
            </header>
            <div className="flex-1 p-6">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line bg-paper/60 py-16 text-center text-muted">{children}</p>;
}

/* ───────────── Painel ───────────── */

function parseCaptured(raw: string | null): Draft | undefined {
  if (!raw) return undefined;
  try {
    const c = JSON.parse(raw) as Captured;
    return {
      title: String(c.t ?? "").slice(0, 140),
      priceCents: toCents(c.p),
      description: String(c.d ?? "").slice(0, 500),
      images: Array.isArray(c.i) ? c.i.filter((u) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 15) : [],
      productUrl: typeof c.u === "string" ? c.u : "",
    };
  } catch {
    return undefined;
  }
}

export function AdminPanel({
  gifts,
  orders,
  stats,
  mpReady,
}: {
  gifts: AdminGift[];
  orders: Orders;
  stats: Stats;
  mpReady: boolean;
}) {
  const searchParams = useSearchParams();
  const [captured] = useState(() => parseCaptured(searchParams.get("capturar")));
  const [tab, setTab] = useState<Tab>("presentes");

  // tira o ?capturar= da barra de endereço para não reabrir ao recarregar
  useEffect(() => {
    if (captured) window.history.replaceState(null, "", "/admin");
  }, [captured]);

  // ao abrir o painel, confere no Mercado Pago os pedidos ainda "aguardando"
  // (no computador local o Mercado Pago não consegue avisar o site sozinho)
  const router = useRouter();
  const hasPending = orders.some((o) => o.status === "pending");
  useEffect(() => {
    if (!mpReady || !hasPending) return;
    refreshPendingOrders().then((r) => r.updated > 0 && router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só uma vez ao abrir
  }, []);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "presentes", label: "Presentes", count: gifts.length },
    { key: "pedidos", label: "Pedidos", count: orders.length },
  ];

  return (
    <div className="lg:flex">
      {/* lateral (desktop) / topo (celular) */}
      <aside className="bg-primary text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:px-7 lg:py-10">
          <div className="flex items-center gap-3 lg:block">
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-line">Lista de presentes</p>
              <p className="mt-1 text-[1.05rem] italic">
                {wedding.groom} &amp; {wedding.bride}
              </p>
            </div>
          </div>
          <form action={logoutAction} className="lg:hidden">
            <button className="text-[0.7rem] uppercase tracking-[0.2em] text-line hover:text-white">Sair</button>
          </form>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-4 lg:flex-col lg:px-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center justify-between gap-6 rounded-lg px-4 py-2.5 text-left text-[0.88rem] transition",
                tab === t.key ? "bg-white/15 text-white" : "text-line hover:bg-white/5 hover:text-white",
              )}
            >
              {t.label}
              <span className="text-[0.72rem] text-line">{t.count}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden space-y-3 px-7 py-8 text-[0.72rem] uppercase tracking-[0.2em] text-line lg:block">
          <Link href="/presentes" target="_blank" className="block hover:text-white">
            Ver a lista ↗
          </Link>
          {mainSite && (
            <a href={mainSite.url} target="_blank" rel="noreferrer" className="block hover:text-white">
              Site do casamento ↗
            </a>
          )}
          <form action={logoutAction}>
            <button className="uppercase tracking-[0.2em] hover:text-white">Sair</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-4 py-8 md:px-10 md:py-10">
        {/* números principais */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <StatCard title="Presentes recebidos" value={brl(stats.paidCents)} hint={`${stats.paidCount} pagamento(s)`} />
          <StatCard title="Na lista" value={`${gifts.filter((g) => g.active).length}`} hint={`${gifts.length} cadastrados`} />
          <StatCard title="Aguardando pagamento" value={`${pendingOrders}`} hint="Pix ainda não pago, boleto ou desistência" />
        </section>

        {!mpReady && (
          <p className="mt-4 rounded-xl border border-[#f1e2b3] bg-[#fffaf0] px-5 py-3 text-[0.85rem] text-[#7a5a00]">
            <strong className="font-semibold">Mercado Pago ainda não conectado.</strong> Os pedidos ficam registrados como
            “aguardando” e vocês podem marcar como pago manualmente na aba Pedidos.
          </p>
        )}

        <div className="mt-10">
          {tab === "presentes" && <Gifts gifts={gifts} draft={captured} />}
          {tab === "pedidos" && <OrdersTable orders={orders} mpReady={mpReady} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, hint, children }: { title: string; value: string; hint: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-paper p-5 shadow-[0_1px_2px_rgb(27_59_92/0.06)]">
      <p className="text-[0.62rem] uppercase tracking-[0.22em] text-muted">{title}</p>
      <p className="mt-2 truncate text-[clamp(1.4rem,2.6vw,2rem)] tracking-[0.04em] text-primary">{value}</p>
      <p className="mt-1 text-[0.78rem] text-faint">{hint}</p>
      {children}
    </div>
  );
}

function Progress({ parts, total }: { parts: [number, string][]; total: number }) {
  return (
    <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-cloud">
      {parts.map(([n, cls], i) => (
        <div key={i} className={cls} style={{ width: total ? `${(n / total) * 100}%` : 0 }} />
      ))}
    </div>
  );
}

/* ───────────── Convidados ───────────── */

/* ───────────── Presentes ───────────── */

type GiftFilter = "todos" | "visiveis" | "ocultos" | "esgotados";
type GiftSort = "ordem" | "menor" | "maior" | "nome" | "recentes";

function Gifts({ gifts, draft }: { gifts: AdminGift[]; draft?: Draft }) {
  const [list, setList] = useState<ListKey>("casamento");
  const [filter, setFilter] = useState<GiftFilter>("todos");
  const [sort, setSort] = useState<GiftSort>("ordem");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ gift: AdminGift | null; draft?: Draft } | null>(draft ? { gift: null, draft } : null);
  const [importing, setImporting] = useState(false);
  const [pending, run] = useAction();

  const inList = gifts.filter((g) => g.list === list);
  const soldOut = (g: AdminGift) => g.taken >= g.quantity;

  const shown = useMemo(() => {
    const rows = inList
      .filter((g) =>
        filter === "visiveis" ? g.active : filter === "ocultos" ? !g.active : filter === "esgotados" ? soldOut(g) : true,
      )
      .filter((g) => !q || normalize(`${g.title} ${g.description ?? ""}`).includes(normalize(q)));
    const by: Record<GiftSort, (a: AdminGift, b: AdminGift) => number> = {
      ordem: (a, b) => a.sort - b.sort || a.priceCents - b.priceCents,
      menor: (a, b) => a.priceCents - b.priceCents,
      maior: (a, b) => b.priceCents - a.priceCents,
      nome: (a, b) => a.title.localeCompare(b.title, "pt-BR"),
      recentes: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    };
    return rows.sort(by[sort]);
  }, [inList, filter, q, sort]);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-2xl italic text-primary">Presentes</h1>
          <Chips value={list} onChange={setList} options={LISTS.map(([k, t]) => [k, t, gifts.filter((g) => g.list === k).length])} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImporting(true)} className={btnQuiet}>
            Adicionar vários
          </button>
          <button onClick={() => setEditing({ gift: null })} className={btnPrimary}>
            + Novo presente
          </button>
        </div>
      </div>

      <CaptureHelp />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            ["todos", "Todos", inList.length],
            ["visiveis", "Visíveis", inList.filter((g) => g.active).length],
            ["ocultos", "Ocultos", inList.filter((g) => !g.active).length],
            ["esgotados", "Já presenteados", inList.filter(soldOut).length],
          ]}
        />
        <div className="flex gap-2 lg:w-[460px]">
          <Search value={q} onChange={setQ} placeholder="Buscar presente" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as GiftSort)}
            className="w-40 shrink-0 rounded-lg border border-cloud bg-paper px-3 py-2.5 text-[0.88rem] text-ink outline-none focus:border-sage"
          >
            <option value="ordem">Ordem do site</option>
            <option value="menor">Menor valor</option>
            <option value="maior">Maior valor</option>
            <option value="nome">Nome (A–Z)</option>
            <option value="recentes">Mais recentes</option>
          </select>
        </div>
      </div>

      {list === "cha" && (
        <p className="mt-4 text-[0.8rem] text-faint">
          A lista do chá fica em <Link href="/cha-de-panela" target="_blank" className="text-primary underline">/cha-de-panela</Link> — só quem tem o link vê.
        </p>
      )}

      <ul className={cn("mt-6 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]", pending && "opacity-60")}>
        {shown.map((g) => (
          <li key={g.id} className={cn("group flex flex-col overflow-hidden rounded-xl bg-paper shadow-[0_1px_2px_rgb(27_59_92/0.06)]", !g.active && "opacity-70")}>
            <button onClick={() => setEditing({ gift: g })} className="relative block aspect-[4/3] bg-sand text-left">
              {g.imageUrl ? (
                <Image src={g.imageUrl} alt={g.title} fill unoptimized sizes="300px" className="object-cover" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-[0.62rem] uppercase tracking-[0.3em] text-white">sem foto</span>
              )}
              {(g.images?.length ?? 0) > 1 && (
                <span className="absolute bottom-2 right-2 rounded-full bg-ink/60 px-2 py-0.5 text-[0.65rem] text-white">{g.images!.length} fotos</span>
              )}
              <span className="absolute left-2 top-2 flex gap-1">
                {!g.active && <span className="rounded-full bg-ink/70 px-2 py-0.5 text-[0.65rem] text-white">Oculto</span>}
                {soldOut(g) && <span className="rounded-full bg-[#1d6b3a] px-2 py-0.5 text-[0.65rem] text-white">Presenteado</span>}
              </span>
            </button>
            <div className="flex flex-1 flex-col p-4">
              <p className="line-clamp-2 text-[0.92rem] leading-snug text-ink">{g.title}</p>
              <p className="mt-1 text-[1.05rem] tracking-[0.03em] text-primary">{brl(g.priceCents)}</p>
              <p className="mt-2 text-[0.72rem] text-faint">
                {g.taken}/{g.quantity} {g.quantity > 1 ? "cotas" : "cota"}
              </p>
              <Progress parts={[[g.taken, "bg-[#1d6b3a]"]]} total={g.quantity} />

              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-[0.72rem] text-muted" title="Mostrar no site">
                  <input
                    type="checkbox"
                    checked={g.active}
                    onChange={(e) => run(() => setGiftActive(g.id, e.target.checked))}
                    className="peer sr-only"
                  />
                  <span className="relative h-4 w-7 rounded-full bg-cloud transition peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:size-3 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-3" />
                  <span className="max-sm:hidden">No site</span>
                </label>
                <div className="flex">
                  <button onClick={() => setEditing({ gift: g })} className="rounded-md px-1.5 py-1 text-[0.72rem] text-muted hover:bg-mist hover:text-primary">
                    Editar
                  </button>
                  <button onClick={() => run(() => duplicateGift(g.id))} className="rounded-md px-1.5 py-1 text-[0.72rem] text-muted hover:bg-mist hover:text-primary" title="Duplicar (a cópia fica oculta)">
                    Duplicar
                  </button>
                  <button
                    onClick={() => confirm(`Excluir "${g.title}"?`) && run(() => deleteGift(g.id))}
                    className="rounded-md px-1.5 py-1 text-[0.72rem] text-muted hover:bg-red-50 hover:text-red-700"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {!shown.length && (
        <div className="mt-6">
          <Empty>{inList.length ? "Nenhum presente com esse filtro." : "Nenhum presente nesta lista ainda."}</Empty>
        </div>
      )}

      <Drawer open={!!editing} title={editing?.gift ? "Editar presente" : "Novo presente"} onClose={() => setEditing(null)}>
        {editing && (
          <GiftForm
            key={editing.gift ? editing.gift.id : "new"}
            gift={editing.gift}
            draft={editing.draft}
            list={list}
            onClose={() => setEditing(null)}
          />
        )}
      </Drawer>
      <Drawer open={importing} title="Adicionar vários presentes" onClose={() => setImporting(false)}>
        <ImportForm list={list} onClose={() => setImporting(false)} />
      </Drawer>
    </div>
  );
}

/** Presente vindo do botão "Capturar presente" ou da busca pelo link */
type Draft = { title: string; priceCents: number | null; description: string; images: string[]; productUrl: string };

const centsToInput = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

function GiftForm({ gift, draft, list, onClose }: { gift: AdminGift | null; draft?: Draft; list: ListKey; onClose: () => void }) {
  // "Salvar e adicionar outro" recria o formulário do zero
  const [round, setRound] = useState(0);
  return (
    <GiftFormFields
      key={round}
      gift={gift}
      draft={round === 0 ? draft : undefined}
      list={list}
      onClose={onClose}
      onAgain={() => setRound((r) => r + 1)}
    />
  );
}

function GiftFormFields({
  gift,
  draft,
  list,
  onClose,
  onAgain,
}: {
  gift: AdminGift | null;
  draft?: Draft;
  list: ListKey;
  onClose: () => void;
  onAgain: () => void;
}) {
  const [pending, run] = useAction();
  const [title, setTitle] = useState(gift?.title ?? draft?.title ?? "");
  const [price, setPrice] = useState(centsToInput(gift?.priceCents ?? draft?.priceCents));
  const [description, setDescription] = useState(gift?.description ?? draft?.description ?? "");
  const [images, setImages] = useState<string[]>(gift?.images?.length ? gift.images : gift?.imageUrl ? [gift.imageUrl] : (draft?.images ?? []));
  const [productUrl, setProductUrl] = useState(gift?.productUrl ?? draft?.productUrl ?? "");
  const [newImage, setNewImage] = useState("");
  const [fetching, setFetching] = useState(false);
  const [note, setNote] = useState<string | null>(
    draft ? `Puxado da loja: ${draft.images.length} foto(s)${draft.priceCents ? ", valor" : ""}${draft.description ? ", descrição" : ""}. Confira e salve.` : null,
  );
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastFetched = useRef(gift?.productUrl ?? draft?.productUrl ?? "");

  const merge = (urls: string[]) => setImages((cur) => [...new Set([...cur, ...urls])].slice(0, 15));
  const isLink = (u: string) => /^https?:\/\/[^\s/]+\.[^\s/]+\/\S+/.test(u.trim());

  /** Busca o produto e preenche tudo — os campos continuam editáveis depois */
  const lookup = async (url: string) => {
    url = url.trim();
    if (!isLink(url)) return setNote("Cole o link completo do produto (começando com https://).");
    lastFetched.current = url;
    setFetching(true);
    setNote(null);
    const r = await fetchProductInfo(url);
    setFetching(false);
    if (lastFetched.current !== url) return; // trocaram o link no meio da busca
    if (!r.ok) return setNote(r.error);
    if (r.blocked || (!r.images.length && !r.title)) {
      return setNote(
        "Essa loja não deixa o site ler a página (Amazon, Magalu e Mercado Livre bloqueiam). Abra o produto e use o botão “🎁 Capturar presente” — veja o quadro acima da lista.",
      );
    }
    if (r.images.length) setImages(r.images);
    if (r.title) setTitle(r.title);
    if (r.priceCents) setPrice(centsToInput(r.priceCents));
    if (r.description) setDescription(r.description);
    const got = [r.title && "nome", r.priceCents && "valor", r.description && "descrição", r.images.length && `${r.images.length} foto(s)`].filter(Boolean);
    setNote(`Puxado da loja: ${got.join(", ")}. Confira e ajuste o que quiser.`);
  };

  // colou ou digitou um link novo → busca sozinho depois de uma pausa curta
  const onLinkChange = (value: string) => {
    setProductUrl(value);
    clearTimeout(timer.current);
    if (isLink(value) && value.trim() !== lastFetched.current) timer.current = setTimeout(() => lookup(value), 500);
  };

  const move = (i: number, d: -1 | 1) =>
    setImages((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form
      action={(fd) =>
        run(async () => {
          const again = fd.get("again") === "1";
          await saveGift(fd);
          if (again) onAgain();
          else onClose();
        })
      }
      className="space-y-5"
    >
      {gift && <input type="hidden" name="id" value={gift.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {/* link do produto → preenche tudo sozinho */}
      <div className="rounded-xl border border-cloud bg-paper p-4">
        <span className={label}>Link do produto na loja</span>
        <div className="flex gap-2">
          <input
            name="productUrl"
            type="url"
            className={input}
            value={productUrl}
            onChange={(e) => onLinkChange(e.target.value)}
            placeholder="Cole aqui o link do produto — o resto se preenche sozinho"
            autoFocus={!gift && !draft}
          />
          <button
            type="button"
            onClick={() => lookup(productUrl)}
            disabled={fetching || !productUrl}
            className={cn(btnQuiet, "shrink-0")}
            title="Buscar de novo na loja"
          >
            {fetching ? "Buscando…" : "Atualizar"}
          </button>
        </div>
        {fetching && <p className="mt-2 animate-pulse text-[0.78rem] text-muted">Lendo a página da loja…</p>}
        {note && !fetching && <p className="mt-2 text-[0.78rem] text-primary">{note}</p>}
      </div>

      {/* fotos: a primeira é a capa */}
      <div>
        <span className={label}>Fotos {images.length > 0 && `(${images.length}) — a primeira é a capa`}</span>
        {images.length ? (
          <ul className="grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <li key={src} className={cn("group relative aspect-square overflow-hidden rounded-lg bg-mist", i === 0 && "ring-2 ring-primary")}>
                <Image src={src} alt="" fill unoptimized sizes="150px" className="object-contain" />
                {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[0.6rem] text-white">capa</span>}
                <span className="absolute inset-x-1 bottom-1 flex justify-between opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <span className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} className="grid size-6 place-items-center rounded-full bg-paper/90 text-[0.75rem] shadow" title="Mover para a esquerda">
                      ←
                    </button>
                    <button type="button" onClick={() => move(i, 1)} className="grid size-6 place-items-center rounded-full bg-paper/90 text-[0.75rem] shadow" title="Mover para a direita">
                      →
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => setImages((cur) => cur.filter((x) => x !== src))}
                    className="grid size-6 place-items-center rounded-full bg-paper/90 text-[0.85rem] text-red-700 shadow"
                    title="Tirar foto"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid aspect-[16/7] place-items-center rounded-xl bg-sand text-[0.65rem] uppercase tracking-[0.3em] text-white">sem fotos ainda</div>
        )}
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            className={input}
            value={newImage}
            onChange={(e) => setNewImage(e.target.value)}
            placeholder="Ou cole o link de uma foto"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (/^https?:\/\//.test(newImage)) {
                  merge([newImage.trim()]);
                  setNewImage("");
                }
              }
            }}
          />
          <button
            type="button"
            className={cn(btnQuiet, "shrink-0")}
            disabled={!/^https?:\/\//.test(newImage)}
            onClick={() => {
              merge([newImage.trim()]);
              setNewImage("");
            }}
          >
            Adicionar
          </button>
        </div>
      </div>

      <label className="block">
        <span className={label}>Nome do presente</span>
        <input name="title" className={input} value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Jogo de panelas" />
      </label>
      <label className="block">
        <span className={label}>Descrição (opcional)</span>
        <textarea
          name="description"
          className={cn(input, "min-h-20")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className={label}>Valor (R$)</span>
          <input name="price" className={input} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="250,00" required />
        </label>
        <label className="block">
          <span className={label}>Cotas</span>
          <input name="quantity" type="number" min={1} max={999} className={input} defaultValue={gift?.quantity ?? 1} />
        </label>
        <label className="block">
          <span className={label}>Lista</span>
          <select name="list" className={input} defaultValue={gift?.list ?? list}>
            {LISTS.map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Ordem no site</span>
          <input name="sort" type="number" className={input} defaultValue={gift?.sort ?? 0} />
        </label>
      </div>
      <p className="text-[0.75rem] text-faint">
        Cotas: quantas pessoas podem dar esse presente (ex.: “lua de mel” com 10 cotas). Ordem: números menores aparecem primeiro.
      </p>

      <label className="flex items-center gap-3 text-[0.9rem] text-ink">
        <input name="active" type="checkbox" defaultChecked={gift?.active ?? true} className="size-4 accent-[var(--color-primary)]" />
        Mostrar no site
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <button className={btnPrimary} disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {!gift && (
          <button name="again" value="1" className={btnQuiet} disabled={pending}>
            Salvar e adicionar outro
          </button>
        )}
        <button type="button" onClick={onClose} className={btnQuiet}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Quadro com o botão para arrastar até a barra de favoritos */
function CaptureHelp() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  // o React bloqueia href "javascript:" no JSX, então ele entra direto no elemento
  useEffect(() => {
    ref.current?.setAttribute("href", bookmarkletHref(window.location.origin));
  }, [open]);

  return (
    <div className="mt-6 rounded-xl border border-sage-soft bg-paper p-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="text-[0.9rem] text-ink">
          <strong className="font-semibold text-primary">Capturar presente</strong> — pegue nome, preço e todas as fotos direto da página da loja
        </span>
        <span className="text-[0.8rem] text-muted">{open ? "fechar" : "como usar"}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-4 text-[0.85rem] leading-relaxed text-muted md:grid-cols-[auto_1fr] md:items-center">
          <a
            ref={ref}
            onClick={(e) => {
              e.preventDefault();
              alert("Arraste este botão até a barra de favoritos do navegador (não clique aqui).");
            }}
            className="inline-flex cursor-grab items-center gap-2 justify-self-start rounded-lg bg-primary px-4 py-2.5 text-[0.85rem] text-white shadow"
          >
            🎁 Capturar presente
          </a>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <strong className="text-ink">Arraste</strong> o botão até a barra de favoritos (se ela não aparecer: Ctrl+Shift+B).
            </li>
            <li>Abra o produto em qualquer loja — Amazon, Magalu, Mercado Livre, Tok&amp;Stok…</li>
            <li>
              Clique em <strong className="text-ink">🎁 Capturar presente</strong> na barra: o painel abre com o presente preenchido. É só
              conferir as fotos e salvar.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

/** Colar uma lista inteira (ex.: de uma planilha) e criar tudo de uma vez */
function ImportForm({ list, onClose }: { list: ListKey; onClose: () => void }) {
  const [target, setTarget] = useState<ListKey>(list);
  const [raw, setRaw] = useState("");
  const [pending, run] = useAction();
  const valid = raw.split(/\r?\n/).filter((l) => {
    const [t, p] = l.split(/[;\t]/).map((c) => c.trim());
    return t && p && /\d/.test(p);
  }).length;

  return (
    <div className="space-y-5">
      <p className="text-[0.88rem] leading-relaxed text-muted">
        Um presente por linha, separando com <strong className="text-ink">;</strong> — ou cole direto de uma planilha
        (colunas nessa ordem):
      </p>
      <pre className="overflow-x-auto rounded-lg bg-paper p-3 text-[0.75rem] leading-relaxed text-ink">
        {"Nome ; valor ; link da imagem ; descrição\n"}
        {"Jogo de panelas ; 450,00 ; https://… ; Inox, 5 peças\n"}
        {"Cafeteira ; 280"}
      </pre>
      <p className="text-[0.75rem] text-faint">Imagem e descrição são opcionais. Tudo entra visível; dá para ajustar depois.</p>

      <label className="block">
        <span className={label}>Lista</span>
        <select value={target} onChange={(e) => setTarget(e.target.value as ListKey)} className={input}>
          {LISTS.map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} className={cn(input, "min-h-56 font-mono text-[0.8rem]")} autoFocus />

      <div className="flex items-center gap-3">
        <button
          className={btnPrimary}
          disabled={pending || !valid}
          onClick={() =>
            run(async () => {
              await importGifts(target, raw);
              onClose();
            })
          }
        >
          {pending ? "Adicionando…" : `Adicionar ${valid || ""} presente${valid === 1 ? "" : "s"}`}
        </button>
        <button type="button" onClick={onClose} className={btnQuiet}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ───────────── Pedidos ───────────── */

function OrdersTable({ orders, mpReady }: { orders: Orders; mpReady: boolean }) {
  const [filter, setFilter] = useState<"todos" | keyof typeof ORDER_STATUS>("todos");
  const [pending, run] = useAction();
  const [checked, setChecked] = useState<string | null>(null);
  const waiting = orders.filter((o) => o.status === "pending").length;
  const shown = orders.filter((o) => filter === "todos" || o.status === filter);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl italic text-primary">Pedidos</h1>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            ["todos", "Todos", orders.length],
            ["pending", "Aguardando", orders.filter((o) => o.status === "pending").length],
            ["paid", "Pagos", orders.filter((o) => o.status === "paid").length],
            ["cancelled", "Cancelados", orders.filter((o) => o.status === "cancelled").length],
          ]}
        />
      </div>

      {mpReady && waiting > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.82rem] text-muted">
          <button
            className={btnQuiet}
            disabled={pending}
            onClick={() =>
              run(async () => {
                const r = await refreshPendingOrders();
                setChecked(`${r.checked} pedido(s) conferido(s) · ${r.updated} atualizado(s)`);
              })
            }
          >
            {pending ? "Conferindo…" : "Conferir no Mercado Pago"}
          </button>
          {checked ?? "Pedidos “aguardando” podem ser Pix ainda não pago ou alguém que desistiu no meio."}
        </div>
      )}

      <div className={cn("mt-6 overflow-x-auto rounded-xl bg-paper shadow-[0_1px_2px_rgb(27_59_92/0.06)]", pending && "opacity-60")}>
        <table className="w-full min-w-[640px] text-left text-[0.88rem]">
          <thead className="text-[0.62rem] uppercase tracking-[0.2em] text-muted">
            <tr className="border-b border-cloud">
              <th className="p-4 font-normal">Data</th>
              <th className="p-4 font-normal">De</th>
              <th className="p-4 font-normal">Presente</th>
              <th className="p-4 font-normal">Valor</th>
              <th className="p-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.id} className="border-b border-cloud/70 align-top last:border-0">
                <td className="whitespace-nowrap p-4 text-faint">{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                <td className="p-4">
                  <p className="text-ink">{o.buyerName}</p>
                  {o.message && <p className="mt-1 max-w-xs text-[0.8rem] italic text-primary">“{o.message}”</p>}
                </td>
                <td className="p-4 text-ink">
                  {o.giftTitle}
                  {o.list === "cha" && <span className="ml-2 text-[0.72rem] text-faint">chá</span>}
                </td>
                <td className="whitespace-nowrap p-4 text-primary">{brl(o.amountCents)}</td>
                <td className="p-4">
                  <select
                    value={o.status}
                    onChange={(e) => run(() => setOrderStatus(o.id, e.target.value as keyof typeof ORDER_STATUS))}
                    className={cn("cursor-pointer rounded-full px-3 py-1 text-[0.75rem] outline-none", ORDER_STATUS[o.status].cls)}
                  >
                    {Object.entries(ORDER_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="py-14 text-center text-muted">Nenhum pedido por aqui.</p>}
      </div>
    </div>
  );
}
