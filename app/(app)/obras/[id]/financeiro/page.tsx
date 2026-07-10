import { db } from "@/lib/db";
import { criarCompra, atualizarCompra } from "@/app/actions";
import { brl, dataBR } from "@/lib/fmt";
import { hojeISO } from "@/lib/status";
import MetricCard from "@/components/MetricCard";

export const dynamic = "force-dynamic";

export default async function Financeiro({ params }: { params: { id: string } }) {
  const [{ data: compras }, { data: etapas }] = await Promise.all([
    db.from("compras").select("*").eq("obra_id", params.id).order("data_necessaria", { ascending: true, nullsFirst: false }),
    db.from("etapas").select("id, macroetapa, servico, custo_previsto, custo_real").eq("obra_id", params.id).order("ordem")
  ]);
  const hoje = hojeISO();
  const lista = compras ?? [];
  const totalCompras = lista.reduce((s, c) => s + Number(c.valor || 0), 0);
  const pagas = lista.filter((c) => c.status_pagamento === "pago").reduce((s, c) => s + Number(c.valor || 0), 0);

  // Orçado vs Realizado por macroetapa
  const porMacro = new Map<string, { prev: number; real: number }>();
  (etapas ?? []).forEach((e) => {
    const g = porMacro.get(e.macroetapa) ?? { prev: 0, real: 0 };
    g.prev += Number(e.custo_previsto || 0);
    g.real += Number(e.custo_real || 0);
    porMacro.set(e.macroetapa, g);
  });

  const ST_COMPRA: Record<string, string> = { cotacao: "Cotação", pedido: "Pedido", entregue: "Entregue" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard titulo="Total em compras" valor={brl(totalCompras)} sub={`${lista.length} pedido(s)`} />
        <MetricCard titulo="Compras pagas" valor={brl(pagas)} tom="ok" />
        <MetricCard titulo="Compras a pagar" valor={brl(totalCompras - pagas)}
          tom={totalCompras - pagas > 0 ? "warn" : "neutro"} />
      </div>

      <section className="card overflow-hidden">
        <div className="px-4 py-2.5 bg-graphite text-white">
          <h2 className="font-display font-semibold text-sm">Balanço Orçado × Realizado por macroetapa</h2>
        </div>
        <table className="grid-table">
          <thead>
            <tr><th>Macroetapa</th><th className="text-right">Orçado</th><th className="text-right">Realizado</th><th className="text-right">Desvio</th></tr>
          </thead>
          <tbody>
            {[...porMacro.entries()].map(([macro, v]) => (
              <tr key={macro}>
                <td className="font-medium">{macro}</td>
                <td className="text-right">{brl(v.prev)}</td>
                <td className="text-right">{brl(v.real)}</td>
                <td className={`text-right font-medium ${v.real - v.prev > 0 ? "text-danger" : "text-ok"}`}>
                  {brl(v.real - v.prev)}
                </td>
              </tr>
            ))}
            {porMacro.size === 0 && <tr><td colSpan={4} className="text-steel">Sem etapas com custos lançados.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-semibold">Suprimentos — Controle de compras</h2>
        <form action={criarCompra} className="card p-4 grid md:grid-cols-8 gap-3 items-end">
          <input type="hidden" name="obra_id" value={params.id} />
          <div className="md:col-span-2">
            <label className="label">Material *</label>
            <input name="material" required className="input" placeholder="Cimento CP-II 50kg" />
          </div>
          <div>
            <label className="label">Fornecedor</label>
            <input name="fornecedor" className="input" />
          </div>
          <div>
            <label className="label">Qtd.</label>
            <input name="quantidade" className="input" placeholder="120 sc" />
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input name="valor" className="input" placeholder="0,00" />
          </div>
          <div>
            <label className="label">Necessário em *</label>
            <input name="data_necessaria" type="date" className="input" />
          </div>
          <div>
            <label className="label">Entrega prevista</label>
            <input name="data_entrega_prevista" type="date" className="input" />
          </div>
          <div className="flex items-end">
            <button className="btn w-full justify-center">Adicionar</button>
          </div>
          <div className="md:col-span-8">
            <label className="label">Vincular à etapa (opcional)</label>
            <select name="etapa_id" className="input">
              <option value="">— Sem vínculo —</option>
              {(etapas ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.macroetapa} · {e.servico}</option>
              ))}
            </select>
          </div>
        </form>

        <div className="card overflow-x-auto">
          <table className="grid-table min-w-[900px]">
            <thead>
              <tr>
                <th>Material</th><th>Fornecedor</th><th>Qtd.</th><th className="text-right">Valor</th>
                <th>Necessário em</th><th>Entrega prev.</th><th>Situação</th><th>Pagamento</th><th>Entrega real</th><th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const critico = c.data_necessaria && c.status !== "entregue" && c.data_necessaria <= hoje;
                return (
                  <tr key={c.id} className={critico ? "bg-dangersoft/40" : ""}>
                    <td className="font-medium">
                      {c.material}
                      {critico && <p className="text-[11px] text-danger">Prazo estourado — etapa em risco</p>}
                    </td>
                    <td>{c.fornecedor ?? "—"}</td>
                    <td>{c.quantidade ?? "—"}</td>
                    <td className="text-right">{brl(c.valor)}</td>
                    <td>{dataBR(c.data_necessaria)}</td>
                    <td>{dataBR(c.data_entrega_prevista)}</td>
                    <td colSpan={4}>
                      <form action={atualizarCompra} className="flex flex-wrap gap-2 items-center">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="obra_id" value={params.id} />
                        <select name="status" defaultValue={c.status} className="input !w-auto">
                          {Object.entries(ST_COMPRA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <select name="status_pagamento" defaultValue={c.status_pagamento} className="input !w-auto">
                          <option value="pendente">Pgto pendente</option>
                          <option value="pago">Pago</option>
                        </select>
                        <input name="data_entrega_real" type="date" defaultValue={c.data_entrega_real ?? ""} className="input !w-auto" />
                        <button className="btn-ghost">Salvar</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && <tr><td colSpan={10} className="text-steel">Nenhuma compra lançada.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
