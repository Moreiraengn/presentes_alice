import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Espaço de foto. Sem `src`, mostra o bloco cor de areia com "EM BREVE...",
 * com um brilho suave passando — assim a página já fica pronta enquanto as fotos não chegam.
 */
export function PhotoSlot({
  src,
  alt = "",
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
  label = true,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** false = só o bloco, sem o "em breve" */
  label?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-sand", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <>
          <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_30%,rgb(255_255_255/0.18)_50%,transparent_70%)]" />
          {label && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              role="img"
              aria-label={alt ? `${alt} — foto em breve` : "Foto em breve"}
            >
              <span className="eyebrow text-[0.6rem] tracking-[0.5em] text-white">
                Em breve
                {[0, 1, 2].map((i) => (
                  <span key={i} className="animate-dot tracking-[0.2em]" style={{ animationDelay: `${i * 0.18}s` }}>
                    .
                  </span>
                ))}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
