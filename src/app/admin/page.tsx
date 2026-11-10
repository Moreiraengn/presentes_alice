import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPanel } from "@/components/admin/admin-panel";
import { LoginForm } from "@/components/admin/login-form";
import { isAdmin } from "@/lib/auth";
import { getAllGifts, getOrders, getStats } from "@/lib/data";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

async function Gate() {
  if (!(await isAdmin())) return <LoginForm />;
  const [gifts, orders, stats] = await Promise.all([getAllGifts(), getOrders(), getStats()]);
  // o Mercado Pago entra quando MP_ACCESS_TOKEN estiver definido
  const mpReady = Boolean(process.env.MP_ACCESS_TOKEN?.trim());
  return <AdminPanel gifts={gifts} orders={orders} stats={stats} mpReady={mpReady} />;
}

export default function AdminPage() {
  return (
    <main className="min-h-dvh bg-[#f5f7fa]">
      <Suspense fallback={<p className="p-10 text-center text-muted">Carregando…</p>}>
        <Gate />
      </Suspense>
    </main>
  );
}
