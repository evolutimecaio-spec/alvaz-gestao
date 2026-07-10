import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

const abas = [
  { seg: "", rotulo: "Visão Geral" },
  { seg: "editar", rotulo: "Editar" },
  { seg: "cronograma", rotulo: "Cronograma" },
  { seg: "kanban", rotulo: "Kanban" },
  { seg: "financeiro", rotulo: "Financeiro" },
  { seg: "rdo", rotulo: "Diário de Obra" },
  { seg: "aditivos", rotulo: "Aditivos" },
  { seg: "documentos", rotulo: "Documentos" },
  { seg: "midias", rotulo: "Mídias" },
  { seg: "relatorio", rotulo: "Relatório" },
  { seg: "memorial", rotulo: "Memorial" }
];

export default async function ObraLayout({
  children, params
}: { children: React.ReactNode; params: { id: string } }) {
  const { data: obra } = await db
    .from("obras")
    .select("id, nome, endereco, rt_nome, crea, status, clientes(nome)")
    .eq("id", params.id)
    .single();
  if (!obra) notFound();
  const cliente = Array.isArray(obra.clientes) ? obra.clientes[0] : obra.clientes;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs text-steel">
          <Link href="/obras" className="hover:text-brand">Obras</Link> / {obra.nome}
        </p>
        <h1 className="font-display text-2xl font-bold">{obra.nome}</h1>
        <p className="text-sm text-steel">
          {cliente?.nome ?? "Sem cliente"} · {obra.endereco ?? "—"}
          {obra.rt_nome ? ` · RT: ${obra.rt_nome}` : ""} {obra.crea ? `(CREA ${obra.crea})` : ""}
        </p>
      </header>
      <nav className="flex flex-wrap gap-1 border-b border-black/10">
        {abas.map((a) => (
          <Link key={a.seg} href={`/obras/${obra.id}${a.seg ? `/${a.seg}` : ""}`}
            className="px-3 py-2 text-sm text-steel hover:text-ink border-b-2 border-transparent hover:border-brand">
            {a.rotulo}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
