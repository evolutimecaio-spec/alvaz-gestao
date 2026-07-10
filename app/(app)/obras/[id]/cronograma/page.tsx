import { db } from "@/lib/db";
import { statusExecucao, desvioDias, hojeISO } from "@/lib/status";
import { criarEtapa, atualizarEtapa, excluirEtapa } from "@/app/actions";
import { ExecBadge, MedicaoBadge, AvisoMedicao } from "@/components/Badges";
import { brl, dataBR } from "@/lib/fmt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Cronograma({
  params, searchParams
}: { params: { id: string }; searchParams: { memorial?: string } }) {
  const { data: etapas } = await db
    .from("etapas").select("*").eq("obra_id", params.id).order("ordem");
  const hoje = hojeISO();
  const lista = etapas ?? [];

  const grupos: { macro: string; itens: typeof lista }[] = [];
  lista.forEach((e) => {
    const g = grupos.find((x) => x.macro === e.macroetapa);
    if (g) g.itens.push(e);
    else grupos.push({ macro: e.macroetapa, itens: [e] });
  });

  const totalVenda = lista.reduce((s, e) => s + Number(e.medicao_valor || 0), 0);

  return (
    <div className="space-y-4">
      {searchParams.memorial && (
        <p className="rounded-md bg-oksoft text-ok text-sm px-3 py-2">
          Memorial processado: {searchParams.memorial} etapa(s) importada(s) para o escopo.
        </p>
      )}

      {totalVenda > 0 && (
        <div className="card px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-steel">Valor total de venda (soma das etapas)</span>
          <span className="font-display font-bold text-lg text-brand">{brl(totalVenda)}</span>
        </div>
      )}

      {/* Adicionar etapa — recolhido por padrão, não compete com a lista */}
      <details className="card group">
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none list-none">
          <span className="btn-brand !py-1.5 !px-3 text-xs">+ Nova etapa</span>
          <span className="text-sm text-steel">adicionar serviço manualmente ao cronograma</span>
          <span className="ml-auto text-steel text-xs group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <form action={criarEtapa} className="px-4 pb-4 grid md:grid-cols-6 gap-3 items-end border-t border-black/5 pt-4">
          <input type="hidden" name="obra_id" value={params.id} />
          <div>
            <label className="label">Macroetapa</label>
            <input name="macroetapa" required className="input" placeholder="Fundação" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Serviço</label>
            <input name="servico" required className="input" placeholder="Estacas hélice contínua" />
          </div>
          <div>
            <label className="label">Início previsto</label>
            <input name="inicio_previsto" type="date" className="input" />
          </div>
          <div>
            <label className="label">Fim previsto</label>
            <input name="fim_previsto" type="date" className="input" />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">Custo prev.</label>
              <input name="custo_previsto" className="input" placeholder="0,00" />
            </div>
            <button className="btn">Adicionar</button>
          </div>
        </form>
      </details>

      {grupos.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-medium">Cronograma vazio</p>
          <p className="text-sm text-steel mt-1">
            Adicione etapas em "Nova etapa" acima, ou gere tudo de uma vez importando o
            Memorial Descritivo na aba <strong>Memorial</strong>.
          </p>
        </div>
      )}

      {grupos.map((g) => (
        <section key={g.macro} className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-graphite text-white flex items-center gap-3">
            <span className="hazard h-3 w-8 rounded-sm shrink-0" />
            <h2 className="font-display font-semibold text-sm">{g.macro}</h2>
            <span className="text-xs text-white/50 ml-auto">{g.itens.length} serviço(s)</span>
          </div>
          <div className="divide-y divide-black/5">
            {g.itens.map((e) => {
              const st = statusExecucao(e, hoje);
              const desvio = desvioDias(e, hoje);
              return (
                <details key={e.id} className="group/item">
                  {/* LINHA COMPACTA (resumo escaneável) */}
                  <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-concrete/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{e.servico}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <ExecBadge status={st} desvio={desvio} />
                        <MedicaoBadge status={e.medicao_status} />
                        {st === "concluido" && e.medicao_status === "sem_medicao" && <AvisoMedicao />}
                      </div>
                    </div>
                    <div className="hidden sm:block text-right text-xs text-steel shrink-0">
                      <p>{e.inicio_previsto || e.fim_previsto ? `${dataBR(e.inicio_previsto)} → ${dataBR(e.fim_previsto)}` : "sem datas"}</p>
                      {Number(e.medicao_valor) > 0 && <p className="text-ink font-medium">Venda: {brl(e.medicao_valor)}</p>}
                      {Number(e.custo_previsto) > 0 && <p>Custo prev.: {brl(e.custo_previsto)}</p>}
                    </div>
                    <span className="text-steel text-xs group-open/item:rotate-180 transition-transform shrink-0">▾</span>
                  </summary>

                  {/* DETALHE (só ao expandir) */}
                  <form action={atualizarEtapa}
                    className="px-4 pb-4 pt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-concrete/30">
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="obra_id" value={params.id} />

                    <div className="col-span-2 md:col-span-4 text-[11px] font-semibold uppercase tracking-wide text-steel pt-1">
                      Datas
                    </div>
                    <div>
                      <label className="label">Início previsto</label>
                      <input name="inicio_previsto" type="date" defaultValue={e.inicio_previsto ?? ""} className="input" />
                    </div>
                    <div>
                      <label className="label">Fim previsto</label>
                      <input name="fim_previsto" type="date" defaultValue={e.fim_previsto ?? ""} className="input" />
                    </div>
                    <div>
                      <label className="label">Início real</label>
                      <input name="inicio_real" type="date" defaultValue={e.inicio_real ?? ""} className="input" />
                    </div>
                    <div>
                      <label className="label">Fim real</label>
                      <input name="fim_real" type="date" defaultValue={e.fim_real ?? ""} className="input" />
                    </div>

                    <div className="col-span-2 md:col-span-4 text-[11px] font-semibold uppercase tracking-wide text-steel pt-2">
                      Custos e medição
                    </div>
                    <div>
                      <label className="label">Custo previsto</label>
                      <input name="custo_previsto" defaultValue={String(e.custo_previsto ?? 0)} className="input" />
                    </div>
                    <div>
                      <label className="label">Custo real</label>
                      <input name="custo_real" defaultValue={String(e.custo_real ?? 0)} className="input" />
                    </div>
                    <div>
                      <label className="label">Status medição</label>
                      <select name="medicao_status" defaultValue={e.medicao_status} className="input">
                        <option value="sem_medicao">Sem Medição</option>
                        <option value="medida_pendente">Medida / Pendente</option>
                        <option value="medida_paga">Medida e Paga</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Valor medido</label>
                      <input name="medicao_valor" defaultValue={String(e.medicao_valor ?? 0)} className="input" />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="label">Link da medição (Drive/Dropbox)</label>
                      <input name="medicao_link" type="url" defaultValue={e.medicao_link ?? ""}
                        className="input" placeholder="https://drive.google.com/…" />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-end">
                      {e.medicao_link && (
                        <a href={e.medicao_link} target="_blank" rel="noopener noreferrer"
                          className="btn-ghost w-full justify-center">Abrir ↗</a>
                      )}
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <label className="label">Justificativa de desvio</label>
                      <input name="justificativa_atraso" defaultValue={e.justificativa_atraso ?? ""}
                        className="input" placeholder="Ex.: 3 dias perdidos por chuva (RDO 12/05)" />
                    </div>

                    <div className="col-span-2 md:col-span-4 flex gap-2 justify-end pt-1">
                      <button formAction={excluirEtapa} className="btn-ghost text-danger">Excluir etapa</button>
                      <button className="btn-brand">Salvar alterações</button>
                    </div>
                  </form>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
