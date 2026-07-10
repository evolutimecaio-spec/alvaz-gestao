import { db } from "@/lib/db";
import { atualizarObra } from "@/app/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditarObra({
  params, searchParams
}: { params: { id: string }; searchParams: { salvo?: string } }) {
  const [{ data: obra }, { data: contratos }, { data: clientes }] = await Promise.all([
    db.from("obras").select("*").eq("id", params.id).single(),
    db.from("contratos").select("*").eq("obra_id", params.id).limit(1),
    db.from("clientes").select("id, nome").order("nome")
  ]);
  const contrato = contratos?.[0];

  return (
    <div className="max-w-2xl space-y-5">
      {searchParams.salvo && (
        <p className="rounded-md bg-oksoft text-ok text-sm px-3 py-2">Alterações salvas.</p>
      )}
      <form action={atualizarObra} className="card p-5 space-y-4">
        <input type="hidden" name="obra_id" value={params.id} />
        {contrato && <input type="hidden" name="contrato_id" value={contrato.id} />}

        <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Dados da obra</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Nome da obra *</label>
            <input name="nome" required defaultValue={obra?.nome ?? ""} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Endereço</label>
            <input name="endereco" defaultValue={obra?.endereco ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Responsável Técnico (RT)</label>
            <input name="rt_nome" defaultValue={obra?.rt_nome ?? ""} className="input" />
          </div>
          <div>
            <label className="label">CREA</label>
            <input name="crea" defaultValue={obra?.crea ?? ""} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Cliente</label>
            <select name="cliente_id" defaultValue={obra?.cliente_id ?? ""} className="input">
              <option value="">— Sem cliente —</option>
              {(clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        <hr className="border-black/10" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Contrato</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Valor fechado (R$)</label>
            <input name="valor_fechado" defaultValue={contrato ? String(contrato.valor_fechado) : ""}
              className="input" placeholder="850000,00" />
          </div>
          <div>
            <label className="label">Condições</label>
            <input name="condicoes" defaultValue={contrato?.condicoes ?? ""} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Escopo resumido</label>
            <textarea name="escopo_resumo" rows={2} defaultValue={contrato?.escopo_resumo ?? ""} className="input" />
          </div>
        </div>

        <button className="btn-brand">Salvar alterações</button>
      </form>
    </div>
  );
}
