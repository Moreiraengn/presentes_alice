import type { Metadata } from "next";
import { GiftsPage } from "@/components/gifts/gifts-page";
import { coupleNames } from "@/lib/config";

export const metadata: Metadata = {
  title: "Lista de presentes",
  description: `A lista de presentes de casamento de ${coupleNames}.`,
};

export default function Page() {
  return <GiftsPage list="casamento" />;
}
