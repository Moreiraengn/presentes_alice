"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainSite, wedding } from "@/lib/config";

/** Topo simples: nomes do casal no centro e "Voltar para o site" (config.ts → mainSite). */
export function Header() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="bg-primary">
      <nav className="mx-auto grid h-[72px] max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center px-5 md:h-[86px] md:px-14">
        <span />
        <Link href="/presentes" className="whitespace-nowrap text-center font-serif text-[1.35rem] leading-none text-paper md:text-[1.7rem]">
          {wedding.groom}
          <span className="mx-2 italic text-sage-soft md:mx-3">&amp;</span>
          {wedding.bride}
        </Link>
        <div className="flex justify-end">
          {mainSite && (
            <a href={mainSite.url} className="eyebrow text-right text-[0.62rem] tracking-[0.18em] text-line transition-colors hover:text-white md:text-[0.72rem]">
              <span className="hidden sm:inline">{mainSite.label}</span>
              <span className="sm:hidden">Site</span>
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
