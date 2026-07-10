import { db } from "@/lib/db";
import { criarAditivo, atualizarAditivo } from "@/app/actions";
import { brl, dataBR } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function Aditivos({ params }: { params: { id: string } }) {
  const { data: aditivos } = await db
    .from("aditivos").select("*").eq("obra_id", params.id)
    .order("criado_em", { ascending: false });
  const aprovados = (aditivos ?? []).filter((a) => a.status === "aprovado");
  const somaValor = aprovados.reduce((s, a) => s + Number(a.valor || 0), 0);
  const somaPrazo = aprovados.reduce((s, a) => s + (a.impacto_prazo_dias || 0), 0);

  const ST: Record<string, { rotulo: string; cls: string }> = {
    proposto: { rotulo: "Proposto", cls: "bg-warnsoft text-warn" },
    aprovado: { rotulo: "Aprovado", cls: "bg-oksoft text-ok" },
    recusado: { rotulo: "Recusado", cls: "bg-black/5 text-steel" }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <p className="text-sm text-steel">
        Toda mudança de escopo pedida pelo cliente entra aqui — protege a margem e documenta
        o impacto no prazo. Aprovados: <strong>{brl(somaValor)}</strong> e{" "}
        <strong>+{somaPrazo} dia(s)</strong> de prazo.
      </p>

      <form action={criarAditivo} className="card p-4 grid md:grid-cols-6 gap-3 items-end">
        <input type="hidden" name="obra_id" value={params.id} />
        <div className="md:col-span-3">
          <label className="label">Descrição *</label>
          <input name="descricao" required className="input" placeholder="Troca do porcelanato da sala por mármore" />
        </div>
        <div>
          <label className="label">Valor (R$)</label>
          <input name="valor" className="input" placeholder="0,00" />
        </div>
        <div>
          <label className="label">Impacto prazo (dias)</label>
          <input name="impacto_prazo_dias" type="number" className="input" defaultValue={0} />
        </div>
        <button className="btn">Registrar</button>
      </form>

      <div className="card overflow-hidden">
        <table className="grid-table">
          <thead>
            <tr><th>Descrição</th><th className="text-right">Valor</th><th>Prazo</th><th>Data</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(aditivos ?? []).map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.descricao}</td>
                <td className="text-right">{brl(a.valor)}</td>
                <td>+{a.impacto_prazo_dias}d</td>
                <td>{dataBR(a.criado_em?.slice(0, 10))}</td>
                <td><span className={`chip ${ST[a.status].cls}`}>{ST[a.status].rotulo}</span></td>
                <td>
                  <form action={atualizarAditivo} className="flex gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="obra_id" value={params.id} />
                    <select name="status" defaultValue={a.status} className="input !w-auto">
                      <option value="proposto">Proposto</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="recusado">Recusado</option>
                    </select>
                    <button className="btn-ghost">Salvar</button>
                  </form>
                </td>
              </tr>
            ))}
            {(aditivos ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-steel">Nenhum aditivo registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
