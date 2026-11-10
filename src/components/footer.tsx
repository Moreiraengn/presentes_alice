import { Branch } from "@/components/ornament";
import { mainSite, wedding } from "@/lib/config";

export function Footer() {
  return (
    <footer className="bg-primary-night px-6 pb-12 pt-20 text-center text-paper">
      <Branch className="mx-auto w-24 text-sage" />
      <p className="mt-6 font-serif text-[clamp(2rem,4vw,2.8rem)] leading-none">
        {wedding.groom} <span className="italic text-accent">&amp;</span> {wedding.bride}
      </p>
      {wedding.dateShort && <p className="eyebrow mt-5 text-sage">{wedding.dateShort}</p>}
      {mainSite && (
        <a href={mainSite.url} className="eyebrow mt-12 inline-block text-[0.62rem] text-sage-soft/80 hover:text-paper">
          {mainSite.label}
        </a>
      )}
      <p className="eyebrow mt-14 text-[0.58rem] text-paper/35">Feito com amor</p>
    </footer>
  );
}
