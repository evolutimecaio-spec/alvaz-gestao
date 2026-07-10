import { db } from "@/lib/db";
import { criarMidia } from "@/app/actions";
import { dataBR } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function Midias({ params }: { params: { id: string } }) {
  const [{ data: midias }, { data: etapas }] = await Promise.all([
    db.from("midias").select("*, etapas(servico)").eq("obra_id", params.id).order("criado_em", { ascending: false }),
    db.from("etapas").select("id, macroetapa, servico").eq("obra_id", params.id).order("ordem")
  ]);
  const ICONE: Record<string, string> = { foto: "📷", video: "🎬", documento: "📄" };

  return (
    <div className="space-y-5 max-w-4xl">
      <p className="text-sm text-steel">
        Armazenamento indexado por links externos (Google Drive / Dropbox). Arquivos nunca são
        enviados ao sistema — cole sempre o link.
      </p>
      <form action={criarMidia} className="card p-4 grid md:grid-cols-6 gap-3 items-end">
        <input type="hidden" name="obra_id" value={params.id} />
        <div className="md:col-span-2">
          <label className="label">Título *</label>
          <input name="titulo" required className="input" placeholder="Concretagem laje térreo" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Link externo (URL) *</label>
          <input name="url" type="url" required className="input" placeholder="https://drive.google.com/…" />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select name="tipo" className="input">
            <option value="foto">Foto</option>
            <option value="video">Vídeo</option>
            <option value="documento">Documento</option>
          </select>
        </div>
        <button className="btn">Indexar</button>
        <div className="md:col-span-6">
          <label className="label">Vincular à etapa (opcional)</label>
          <select name="etapa_id" className="input">
            <option value="">— Sem vínculo —</option>
            {(etapas ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.macroetapa} · {e.servico}</option>
            ))}
          </select>
        </div>
      </form>

      <div className="card divide-y divide-black/5">
        {(midias ?? []).map((m) => {
          const etapa = Array.isArray(m.etapas) ? m.etapas[0] : m.etapas;
          return (
            <div key={m.id} className="p-3 flex items-center gap-3 text-sm">
              <span>{ICONE[m.tipo] ?? "📎"}</span>
              <div className="flex-1">
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand">
                  {m.titulo} ↗
                </a>
                <p className="text-xs text-steel">
                  {dataBR(m.criado_em?.slice(0, 10))}{etapa ? ` · ${etapa.servico}` : ""}
                </p>
              </div>
            </div>
          );
        })}
        {(midias ?? []).length === 0 && <p className="p-3 text-sm text-steel">Nenhuma mídia indexada.</p>}
      </div>
    </div>
  );
}
