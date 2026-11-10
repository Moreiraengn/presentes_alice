import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { Header } from "@/components/header";
import { coupleNames, wedding } from "@/lib/config";
import "./globals.css";

// ✏️ fontes: Cormorant Garamond (títulos) + Jost (textos). Troque por outras do Google Fonts aqui.
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"] });
const jost = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["300", "400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(wedding.siteUrl),
  title: { default: `Lista de presentes · ${coupleNames}`, template: `%s · ${coupleNames}` },
  description: `A lista de presentes de casamento de ${coupleNames}.`,
  openGraph: { title: `Lista de presentes · ${coupleNames}`, locale: "pt_BR", type: "website" },
};

// ✏️ cor da barra do navegador no celular (use a mesma --color-primary do globals.css)
export const viewport: Viewport = { themeColor: "#5b6b40" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${jost.variable} antialiased`}>
      <body className="min-h-dvh">
        <Header />
        {children}
      </body>
    </html>
  );
}
