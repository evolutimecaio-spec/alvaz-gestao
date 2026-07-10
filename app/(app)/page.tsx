import Link from "next/link";
import { db } from "@/lib/db";
import { statusExecucao, desvioDias, hojeISO, metricas } from "@/lib/status";
import { brl, pct, dataBR } from "@/lib/fmt";
import MetricCard from "@/components/MetricCard";
import { ExecBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function PainelHoje() {
  const hoje = hojeISO();
  const ontem = new Date(new Date(hoje).getTime() - 86400000).toISOString().slice(0, 10);
  const em7dias = new Date(new Date(hoje).getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const { data: obras } = await db
    .from("obras")
    .select("id, nome, status")
    .eq("status", "ativa")
    .order("nome");
  const obraIds = (obras ?? []).map((o) => o.id);
  const nomeObra = new Map((obras ?? []).map((o) => [o.id, o.nome]));

  const { data: etapas } = obraIds.length
    ? await db.from("etapas").select("*").in("obra_id", obraIds)
    : { data: [] as never[] };
  const { data: compras } = obraIds.length
    ? await db.from("compras").select("*").in("obra_id", obraIds).neq("status", "entregue")
    : { data: [] as never[] };
  const { data: rdosOntem } = obraIds.length
    ? await db.from("rdos").select("obra_id").in("obra_id", obraIds).eq("data", ontem)
    : { data: [] as never[] };

  const todas = etapas ?? [];
  const m = metricas(todas);

  // Pendências acionáveis
  const atrasadas = todas
    .filter((e) => ["atrasado", "em_andamento_atrasado"].includes(statusExecucao(e, hoje)))
    .sort((a, b) => desvioDias(b, hoje) - desvioDias(a, hoje));
  const semMedicao = todas.filter(
    (e) => statusExecucao(e, hoje) === "concluido" && e.medicao_status === "sem_medicao"
  );
  const medidasNaoPagas = todas.filter((e) => e.medicao_status === "medida_pendente");
  const comprasUrgentes = (compras ?? []).filter(
    (c) => c.data_necessaria && c.data_necessaria <= em7dias
  );
  const comRdo = new Set((rdosOntem ?? []).map((r) => r.obra_id));
  const rdoFaltando = (obras ?? []).filter((o) => !comRdo.has(o.id));

  const valorAReceber = medidasNaoPagas.reduce((s, e) => s + Number(e.medicao_valor || 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Painel Hoje</h1>
        <p className="text-sm text-steel">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo"
          })}{" "}
          · {obras?.length ?? 0} obra(s) ativa(s)
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard titulo="Progresso Físico Global" valor={pct(m.progressoFisico)}
          sub={`${m.concluidas} de ${m.total} etapas concluídas`} />
        <MetricCard titulo="Índice de Liberação Financeira" valor={pct(m.liberacaoFinanceira)}
          sub="etapas pagas / etapas concluídas"
          tom={m.liberacaoFinanceira < 70 && m.concluidas > 0 ? "warn" : "neutro"} />
        <MetricCard titulo="Desvio Financeiro Geral" valor={brl(m.desvioFinanceiro)}
          sub={`Realizado ${brl(m.custoReal)} vs Orçado ${brl(m.custoPrevisto)}`}
          tom={m.desvioFinanceiro > 0 ? "danger" : "ok"} />
        <MetricCard titulo="A Receber (medido não pago)" valor={brl(valorAReceber)}
          sub={`${medidasNaoPagas.length} medição(ões) aguardando pagamento`}
          tom={valorAReceber > 0 ? "warn" : "neutro"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-danger mb-3">
            ⛔ Etapas atrasadas ({atrasadas.length})
          </h2>
          {atrasadas.length === 0 ? (
            <p className="text-sm text-steel">Nenhuma etapa atrasada. Cronograma sob controle.</p>
          ) : (
            <ul className="space-y-2">
              {atrasadas.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <Link href={`/obras/${e.obra_id}/cronograma`} className="font-medium hover:text-brand">
                      {e.servico}
                    </Link>
                    <p className="text-xs text-steel">{nomeObra.get(e.obra_id)} · {e.macroetapa}</p>
                  </div>
                  <ExecBadge status={statusExecucao(e, hoje)} desvio={desvioDias(e, hoje)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-warn mb-3">
            📏 Concluídas sem medição ({semMedicao.length})
          </h2>
          {semMedicao.length === 0 ? (
            <p className="text-sm text-steel">Nenhum serviço concluído pendente de medição.</p>
          ) : (
            <ul className="space-y-2">
              {semMedicao.slice(0, 8).map((e) => (
                <li key={e.id} className="text-sm">
                  <Link href={`/obras/${e.obra_id}/cronograma`} className="font-medium hover:text-brand">
                    {e.servico}
                  </Link>
                  <p className="text-xs text-warn italic">
                    [Aviso: Serviço concluído físico, pendente de medição] · {nomeObra.get(e.obra_id)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-info mb-3">
            🚚 Compras críticas — próximos 7 dias ({comprasUrgentes.length})
          </h2>
          {comprasUrgentes.length === 0 ? (
            <p className="text-sm text-steel">Nenhum material com prazo crítico esta semana.</p>
          ) : (
            <ul className="space-y-2">
              {comprasUrgentes.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <Link href={`/obras/${c.obra_id}/financeiro`} className="font-medium hover:text-brand">
                      {c.material}
                    </Link>
                    <p className="text-xs text-steel">
                      {nomeObra.get(c.obra_id)} · necessário em {dataBR(c.data_necessaria)}
                    </p>
                  </div>
                  <span className={`chip ${c.data_necessaria < hoje ? "bg-dangersoft text-danger" : "bg-warnsoft text-warn"}`}>
                    {c.status === "cotacao" ? "Ainda em cotação" : "Pedido feito"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-steel mb-3">
            📓 RDO de ontem faltando ({rdoFaltando.length})
          </h2>
          {rdoFaltando.length === 0 ? (
            <p className="text-sm text-steel">Todos os diários de ontem foram preenchidos.</p>
          ) : (
            <ul className="space-y-1.5">
              {rdoFaltando.map((o) => (
                <li key={o.id} className="text-sm">
                  <Link href={`/obras/${o.id}/rdo`} className="font-medium hover:text-brand">
                    {o.nome}
                  </Link>
                  <span className="text-xs text-steel"> — preencher RDO de {dataBR(ontem)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
