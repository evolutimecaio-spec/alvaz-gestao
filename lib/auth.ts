import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "cs_session";

// Sessão por senha única (ferramenta interna, um único acesso "Administrador").
export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const { data } = await db
    .from("sessoes")
    .select("token, expira_em")
    .eq("token", token)
    .single();
  if (!data) return null;
  if (new Date(data.expira_em) < new Date()) return null;
  return { nome: "Administrador" };
}
