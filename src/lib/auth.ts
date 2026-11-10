import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

const COOKIE = "tm_admin";
const MAX_AGE = 60 * 60 * 24 * 14;

function secret() {
  const pwd = process.env.ADMIN_PASSWORD;
  if (pwd) return pwd;
  if (process.env.NODE_ENV === "production") throw new Error("Defina ADMIN_PASSWORD nas variáveis de ambiente.");
  return "admin"; // só em desenvolvimento (defina ADMIN_PASSWORD no .env.local)
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export async function login(password: string) {
  if (!safeEqual(sign(password), sign(secret()))) return false;
  const issued = Date.now().toString();
  (await cookies()).set(COOKIE, `${issued}.${sign(issued)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
  return true;
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [issued, sig] = raw.split(".");
  if (!issued || !sig || !safeEqual(sig, sign(issued))) return false;
  await connection(); // Date.now() só em tempo de requisição
  return Date.now() - Number(issued) < MAX_AGE * 1000;
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Não autorizado");
}
