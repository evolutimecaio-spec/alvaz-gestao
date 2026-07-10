import Link from "next/link";
import { db } from "@/lib/db";
import { metricas } from "@/lib/status";
import { pct, brl } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function Obras() {
  const { data: obras } = await db
    .from("obras")
    .select("*, clientes(nome), contratos(valor_fechado)")
    .order("criado_em", { ascending: false });
  const { data: etapas } = await db.from("etapas").select("*");

  const porObra = new Map<string, NonNullable<typeof etapas>>();
  (etapas ?? []).forEach((e) => {
    const arr = porObra.get(e.obra_id) ?? [];
    arr.push(e);
    porObra.set(e.obra_id, arr);
  });

  const STATUS_OBRA: Record<string, string> = { ativa: "Ativa", pausada: "Pausada", concluida: "Concluída" };

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Obras</h1>
          <p className="text-sm text-steel">Portfólio da construtora</p>
        </div>
        <Link href="/obras/nova" className="btn-brand">+ Nova obra</Link>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(obras ?? []).map((o) => {
          const m = metricas(porObra.get(o.id) ?? []);
          const contrato = o.contratos?.[0];
          const cliente = Array.isArray(o.clientes) ? o.clientes[0] : o.clientes;
          return (
            <Link key={o.id} href={`/obras/${o.id}`} className="card p-4 hover:border-brand/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display font-semibold">{o.nome}</h2>
                <span className={`chip ${o.status === "ativa" ? "bg-oksoft text-ok" : "bg-black/5 text-steel"}`}>
                  {STATUS_OBRA[o.status]}
                </span>
              </div>
              <p className="text-xs text-steel mt-0.5">{cliente?.nome ?? "Sem cliente"} · {o.endereco ?? "—"}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-steel mb-1">
                  <span>Progresso físico</span><span>{pct(m.progressoFisico)}</span>
                </div>
                <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full bg-brand" style={{ width: `${m.progressoFisico}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-xs text-steel mt-3">
                <span>{m.total} etapas</span>
                {contrato ? <span>Contrato {brl(contrato.valor_fechado)}</span> : <span>Sem contrato</span>}
              </div>
              {m.concluidasSemMedicao > 0 && (
                <p className="text-[11px] text-warn italic mt-2">
                  {m.concluidasSemMedicao} serviço(s) concluído(s) pendente(s) de medição
                </p>
              )}
            </Link>
          );
        })}
        {(obras ?? []).length === 0 && (
          <p className="text-sm text-steel">Nenhuma obra cadastrada. Crie a primeira para começar.</p>
        )}
      </div>
    </div>
  );
}
