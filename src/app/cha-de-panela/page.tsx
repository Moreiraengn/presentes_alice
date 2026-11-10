import type { Metadata } from "next";
import { GiftsPage } from "@/components/gifts/gifts-page";

/** Página oculta: não aparece no menu e não é indexada — só quem tem o link acessa. */
export const metadata: Metadata = {
  title: "Chá de panela",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GiftsPage list="cha" />;
}
