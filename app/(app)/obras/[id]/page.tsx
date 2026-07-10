import { db } from "@/lib/db";
import { metricas, hojeISO } from "@/lib/status";
import { brl, pct } from "@/lib/fmt";
import { atualizarStatusObra } from "@/app/actions";
import MetricCard from "@/components/MetricCard";
import CurvaS from "@/components/CurvaS";

export const dynamic = "force-dynamic";

function mesKey(d: string) {
  return d.slice(0, 7); // YYYY-MM
}
function mesLabel(k: string) {
  const [y, m] = k.split("-");
  return `${m}/${y.slice(2)}`;
}

export default async function VisaoGeral({ params }: { params: { id: string } }) {
  const [{ data: obra }, { data: etapas }, { data: contratos }, { data: aditivos }, { data: compras }] =
    await Promise.all([
      db.from("obras").select("status").eq("id", params.id).single(),
      db.from("etapas").select("*").eq("obra_id", params.id).order("ordem"),
      db.from("contratos").select("*").eq("obra_id", params.id),
      db.from("aditivos").select("*").eq("obra_id", params.id).eq("status", "aprovado"),
      db.from("compras").select("valor, status_pagamento").eq("obra_id", params.id)
    ]);

  const lista = etapas ?? [];
  const m = metricas(lista);
  const valorContrato = (contratos ?? []).reduce((s, c) => s + Number(c.valor_fechado || 0), 0);
  const valorAditivos = (aditivos ?? []).reduce((s, a) => s + Number(a.valor || 0), 0);
  const contratoTotal = valorContrato + valorAditivos;
  const comprasPagas = (compras ?? [])
    .filter((c) => c.status_pagamento === "pago")
    .reduce((s, c) => s + Number(c.valor || 0), 0);

  // Curva S: acumulado de etapas com fim_previsto / fim_real por mês
  const meses = new Set<string>();
  lista.forEach((e) => {
    if (e.fim_previsto) meses.add(mesKey(e.fim_previsto));
    if (e.fim_real) meses.add(mesKey(e.fim_real));
  });
  const ordenados = [...meses].sort();
  const hoje = hojeISO();
  const pontos = ordenados.map((mk) => {
    const prev = lista.filter((e) => e.fim_previsto && mesKey(e.fim_previsto) <= mk).length;
    const real = lista.filter((e) => e.fim_real && mesKey(e.fim_real) <= mk).length;
    const futuro = mk > mesKey(hoje);
    return {
      mes: mesLabel(mk),
      previsto: m.total ? (prev / m.total) * 100 : 0,
      realizado: futuro ? 0 : m.total ? (real / m.total) * 100 : 0
    };
  });

  // Curva S financeira: custo acumulado orçado (por fim previsto) x realizado (por fim real)
  const custoTotalPrev = m.custoPrevisto || 1;
  const pontosFin = ordenados.map((mk) => {
    const prev = lista
      .filter((e) => e.fim_previsto && mesKey(e.fim_previsto) <= mk)
      .reduce((s, e) => s + Number(e.custo_previsto || 0), 0);
    const real = lista
      .filter((e) => e.fim_real && mesKey(e.fim_real) <= mk)
      .reduce((s, e) => s + Number(e.custo_real || 0), 0);
    const futuro = mk > mesKey(hoje);
    return {
      mes: mesLabel(mk),
      previsto: (prev / custoTotalPrev) * 100,
      realizado: futuro ? 0 : (real / custoTotalPrev) * 100
    };
  });

  return (
    <div className="space-y-5">
      <form action={atualizarStatusObra} className="card p-3 flex items-center gap-3 text-sm">
        <input type="hidden" name="obra_id" value={params.id} />
        <span className="label !mb-0">Status da obra</span>
        <select name="status" defaultValue={obra?.status ?? "ativa"} className="input !w-auto">
          <option value="ativa">Ativa</option>
          <option value="pausada">Pausada</option>
          <option value="concluida">Concluída</option>
        </select>
        <button className="btn-ghost">Atualizar</button>
        <span className="text-xs text-steel ml-auto">
          Obras pausadas/concluídas saem do Painel Hoje e do Kanban do portfólio.
        </span>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard titulo="Progresso Físico" valor={pct(m.progressoFisico)}
          sub={`${m.concluidas}/${m.total} etapas concluídas`} />
        <MetricCard titulo="Liberação Financeira" valor={pct(m.liberacaoFinanceira)}
          sub={`${m.concluidasSemMedicao} concluída(s) sem medição`}
          tom={m.concluidasSemMedicao > 0 ? "warn" : "neutro"} />
        <MetricCard titulo="Desvio Financeiro" valor={brl(m.desvioFinanceiro)}
          sub={`Real ${brl(m.custoReal)} vs Orçado ${brl(m.custoPrevisto)}`}
          tom={m.desvioFinanceiro > 0 ? "danger" : "ok"} />
        <MetricCard titulo="Contrato + Aditivos" valor={brl(contratoTotal)}
          sub={valorAditivos ? `inclui ${brl(valorAditivos)} em aditivos aprovados` : "sem aditivos aprovados"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard titulo="Medido e Pago (recebido)" valor={brl(m.valorMedidoPago)}
          sub={contratoTotal ? `${pct((m.valorMedidoPago / contratoTotal) * 100)} do contrato` : undefined}
          tom="ok" />
        <MetricCard titulo="Medido total" valor={brl(m.valorMedidoTotal)}
          sub="inclui medições aguardando pagamento" />
        <MetricCard titulo="A receber" valor={brl(m.valorMedidoTotal - m.valorMedidoPago)}
          tom={m.valorMedidoTotal - m.valorMedidoPago > 0 ? "warn" : "neutro"}
          sub="medido, ainda não pago" />
        <MetricCard titulo="Compras pagas" valor={brl(comprasPagas)} sub="suprimentos quitados" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-steel mb-2">
            Curva S — Avanço físico acumulado (%)
          </h2>
          <CurvaS pontos={pontos} />
        </section>
        <section className="card p-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-steel mb-2">
            Curva S — Custo acumulado (% do orçado)
          </h2>
          <CurvaS pontos={pontosFin}
            vazio="Lance custos previstos e reais no cronograma para gerar a curva financeira." />
        </section>
      </div>
    </div>
  );
}
