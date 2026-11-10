"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/admin";
import { coupleNames } from "@/lib/config";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-primary px-4">
      <form action={action} className="w-full max-w-sm rounded-2xl bg-paper p-10 text-center shadow-[0_30px_80px_-30px_rgb(10_30_50/0.5)]">
        <p className="font-serif text-[1.8rem] italic leading-none text-primary">{coupleNames}</p>
        <p className="eyebrow mt-4 text-[0.6rem] text-muted">Lista de presentes · painel</p>
        <input
          name="password"
          type="password"
          className="mt-10 w-full rounded-lg border border-cloud px-4 py-3 text-center outline-none transition focus:border-sage focus:ring-4 focus:ring-sage-soft/40"
          placeholder="Senha"
          autoFocus
          required
        />
        {state?.error && <p className="mt-4 text-sm text-red-700">{state.error}</p>}
        <button className="mt-6 w-full rounded-lg bg-primary py-3 text-[0.85rem] tracking-[0.1em] text-white transition hover:bg-primary-deep disabled:opacity-50" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
