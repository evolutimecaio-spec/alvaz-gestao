import { db } from "@/lib/db";
import { statusExecucao, desvioDias, hojeISO } from "@/lib/status";
import { criarEtapa, atualizarEtapa, excluirEtapa } from "@/app/actions";
import { ExecBadge, MedicaoBadge, AvisoMedicao } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function Cronograma({
  params, searchParams
}: { params: { id: string }; searchParams: { memorial?: string } }) {
  const { data: etapas } = await db
    .from("etapas")
    .select("*")
    .eq("obra_id", params.id)
    .order("ordem");
  const hoje = hojeISO();
  const lista = etapas ?? [];

  // agrupamento por macroetapa preservando a ordem
  const grupos: { macro: string; itens: typeof lista }[] = [];
  lista.forEach((e) => {
    const g = grupos.find((x) => x.macro === e.macroetapa);
    if (g) g.itens.push(e);
    else grupos.push({ macro: e.macroetapa, itens: [e] });
  });

  return (
    <div className="space-y-5">
      {searchParams.memorial && (
        <p className="rounded-md bg-oksoft text-ok text-sm px-3 py-2">
          Memorial processado: {searchParams.memorial} etapa(s) importada(s) para o escopo.
        </p>
      )}

      <form action={criarEtapa} className="card p-4 grid md:grid-cols-6 gap-3 items-end">
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
            <label className="label">Custo previsto</label>
            <input name="custo_previsto" className="input" placeholder="0,00" />
          </div>
          <button className="btn">Adicionar</button>
        </div>
      </form>

      {grupos.length === 0 && (
        <p className="text-sm text-steel">
          Nenhuma etapa. Adicione manualmente acima ou importe um Memorial Descritivo na aba Memorial.
        </p>
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
                <form key={e.id} action={atualizarEtapa}
                  className="p-3 grid grid-cols-2 md:grid-cols-12 gap-2 items-end text-sm">
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="obra_id" value={params.id} />
                  <div className="col-span-2 md:col-span-3">
                    <p className="font-medium leading-snug">{e.servico}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <ExecBadge status={st} desvio={desvio} />
                      <MedicaoBadge status={e.medicao_status} />
                    </div>
                    {st === "concluido" && e.medicao_status === "sem_medicao" && (
                      <div className="mt-1"><AvisoMedicao /></div>
                    )}
                  </div>
                  <div>
                    <label className="label">Iníc. prev.</label>
                    <input name="inicio_previsto" type="date" defaultValue={e.inicio_previsto ?? ""} className="input" />
                  </div>
                  <div>
                    <label className="label">Fim prev.</label>
                    <input name="fim_previsto" type="date" defaultValue={e.fim_previsto ?? ""} className="input" />
                  </div>
                  <div>
                    <label className="label">Iníc. real</label>
                    <input name="inicio_real" type="date" defaultValue={e.inicio_real ?? ""} className="input" />
                  </div>
                  <div>
                    <label className="label">Fim real</label>
                    <input name="fim_real" type="date" defaultValue={e.fim_real ?? ""} className="input" />
                  </div>
                  <div>
                    <label className="label">Custo prev.</label>
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
                  <div className="col-span-2 md:col-span-6">
                    <label className="label">Link da medição (Drive/Dropbox)</label>
                    <input name="medicao_link" type="url" defaultValue={e.medicao_link ?? ""}
                      className="input" placeholder="https://drive.google.com/…" />
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <label className="label">Justificativa de desvio</label>
                    <input name="justificativa_atraso" defaultValue={e.justificativa_atraso ?? ""}
                      className="input" placeholder="Ex.: 3 dias perdidos por chuva (RDO 12/05)" />
                  </div>
                  <div className="col-span-2 md:col-span-2 flex gap-2 justify-end">
                    {e.medicao_link && (
                      <a href={e.medicao_link} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost">Abrir medição ↗</a>
                    )}
                    <button className="btn">Salvar</button>
                    <button formAction={excluirEtapa} className="btn-ghost text-danger">Excluir</button>
                  </div>
                </form>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
