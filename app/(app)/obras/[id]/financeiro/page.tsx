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
        <details className="card group">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none list-none">
            <span className="btn-brand !py-1.5 !px-3 text-xs">+ Nova compra</span>
            <span className="text-sm text-steel">lançar pedido de material</span>
            <span className="ml-auto text-steel text-xs group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <form action={criarCompra} className="px-4 pb-4 pt-4 grid md:grid-cols-8 gap-3 items-end border-t border-black/5">
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
        </details>

        <div className="card divide-y divide-black/5">
          {lista.map((c) => {
            const critico = c.data_necessaria && c.status !== "entregue" && c.data_necessaria <= hoje;
            return (
              <details key={c.id} className="group/c">
                <summary className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-concrete/40 ${critico ? "bg-dangersoft/30" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.material}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`chip ${c.status === "entregue" ? "bg-oksoft text-ok" : c.status === "pedido" ? "bg-infosoft text-info" : "bg-black/5 text-steel"}`}>
                        {ST_COMPRA[c.status]}
                      </span>
                      <span className={`chip ${c.status_pagamento === "pago" ? "bg-oksoft text-ok" : "bg-warnsoft text-warn"}`}>
                        {c.status_pagamento === "pago" ? "Pago" : "A pagar"}
                      </span>
                      {critico && <span className="chip bg-dangersoft text-danger">Prazo estourado</span>}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right text-xs text-steel shrink-0">
                    <p>{brl(c.valor)}</p>
                    <p>necessário {dataBR(c.data_necessaria)}</p>
                  </div>
                  <span className="text-steel text-xs group-open/c:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <div className="px-4 pb-4 pt-1 bg-concrete/30 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-steel mb-3">
                    <p>Fornecedor: <span className="text-ink">{c.fornecedor ?? "—"}</span></p>
                    <p>Quantidade: <span className="text-ink">{c.quantidade ?? "—"}</span></p>
                    <p>Entrega prevista: <span className="text-ink">{dataBR(c.data_entrega_prevista)}</span></p>
                    <p>Valor: <span className="text-ink">{brl(c.valor)}</span></p>
                  </div>
                  <form action={atualizarCompra} className="flex flex-wrap gap-2 items-end">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="obra_id" value={params.id} />
                    <div>
                      <label className="label">Situação</label>
                      <select name="status" defaultValue={c.status} className="input !w-auto">
                        {Object.entries(ST_COMPRA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Pagamento</label>
                      <select name="status_pagamento" defaultValue={c.status_pagamento} className="input !w-auto">
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Entrega real</label>
                      <input name="data_entrega_real" type="date" defaultValue={c.data_entrega_real ?? ""} className="input !w-auto" />
                    </div>
                    <button className="btn-brand">Salvar</button>
                  </form>
                </div>
              </details>
            );
          })}
          {lista.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-steel">
              Nenhuma compra lançada. Adicione a primeira em "Nova compra" acima.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
