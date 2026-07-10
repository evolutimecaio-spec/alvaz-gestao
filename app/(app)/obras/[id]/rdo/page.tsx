import { db } from "@/lib/db";
import { criarRDO } from "@/app/actions";
import { dataBR } from "@/lib/fmt";
import { hojeISO } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function RDO({ params }: { params: { id: string } }) {
  const { data: rdos } = await db
    .from("rdos").select("*").eq("obra_id", params.id)
    .order("data", { ascending: false }).limit(60);
  const diasChuva = (rdos ?? []).filter((r) => r.dia_perdido_chuva).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <form action={criarRDO} className="card p-4 space-y-3">
        <input type="hidden" name="obra_id" value={params.id} />
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="label">Data *</label>
            <input name="data" type="date" defaultValue={hojeISO()} required className="input" />
          </div>
          <div>
            <label className="label">Clima</label>
            <select name="clima" className="input">
              <option>Bom</option><option>Nublado</option><option>Chuva fraca</option>
              <option>Chuva forte</option><option>Impraticável</option>
            </select>
          </div>
          <div>
            <label className="label">Efetivo (pessoas)</label>
            <input name="efetivo" type="number" min="0" className="input" defaultValue={0} />
          </div>
          <label className="flex items-center gap-2 text-sm mt-5">
            <input name="dia_perdido_chuva" type="checkbox" className="accent-brand" />
            Dia perdido por chuva
          </label>
        </div>
        <div>
          <label className="label">Relato do dia</label>
          <textarea name="relato" rows={3} className="input"
            placeholder="Serviços executados, ocorrências, visitas, entregas de material…" />
        </div>
        <button className="btn-brand">Registrar RDO</button>
      </form>

      {diasChuva > 0 && (
        <p className="rounded-md bg-infosoft text-info text-sm px-3 py-2">
          {diasChuva} dia(s) perdido(s) por chuva registrados — use como justificativa documentada
          de desvio de prazo e base para aditivo de prazo com o cliente.
        </p>
      )}

      <div className="space-y-3">
        {(rdos ?? []).map((r) => (
          <article key={r.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-semibold">{dataBR(r.data)}</span>
              <span className="chip bg-black/5 text-steel">{r.clima ?? "—"}</span>
              <span className="chip bg-black/5 text-steel">Efetivo: {r.efetivo}</span>
              {r.dia_perdido_chuva && <span className="chip bg-infosoft text-info">Dia perdido — chuva</span>}
            </div>
            {r.relato && <p className="text-sm mt-2 whitespace-pre-wrap">{r.relato}</p>}
          </article>
        ))}
        {(rdos ?? []).length === 0 && <p className="text-sm text-steel">Nenhum RDO registrado.</p>}
      </div>
    </div>
  );
}
