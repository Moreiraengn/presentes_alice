import { redirect } from "next/navigation";

/** O endereço principal abre direto a lista de presentes */
export default function Home() {
  redirect("/presentes");
}
