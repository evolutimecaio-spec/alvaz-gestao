import { db } from "@/lib/db";
import { criarObra } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NovaObra() {
  const { data: clientes } = await db.from("clientes").select("id, nome").order("nome");
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-bold">Nova obra</h1>
      <form action={criarObra} className="card p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Nome da obra *</label>
            <input name="nome" required className="input" placeholder="Residência Família Silva — Lote 12" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Endereço</label>
            <input name="endereco" className="input" />
          </div>
          <div>
            <label className="label">Responsável Técnico (RT)</label>
            <input name="rt_nome" className="input" />
          </div>
          <div>
            <label className="label">CREA</label>
            <input name="crea" className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Cliente</label>
            <select name="cliente_id" className="input">
              <option value="">— Selecionar (cadastre em Clientes) —</option>
              {(clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
        <hr className="border-black/10" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Contrato (opcional)</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Valor fechado (R$)</label>
            <input name="valor_fechado" className="input" placeholder="850000,00" />
          </div>
          <div>
            <label className="label">Condições</label>
            <input name="condicoes" className="input" placeholder="Medições mensais, 30 dias" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Escopo resumido</label>
            <textarea name="escopo_resumo" rows={2} className="input" />
          </div>
        </div>
        <button className="btn-brand">Criar obra</button>
      </form>
    </div>
  );
}
