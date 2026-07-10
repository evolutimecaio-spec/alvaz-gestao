import { db } from "@/lib/db";
import { criarDocumento, excluirDocumento } from "@/app/actions";
import { dataBR } from "@/lib/fmt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ERROS: Record<string, string> = {
  arquivo: "Nenhum arquivo selecionado.",
  upload: "Falha no upload. Confirme que o bucket 'documentos' existe no Supabase Storage.",
};

const CATEGORIAS: Record<string, string> = {
  contrato: "Contrato",
  art_rrt: "ART / RRT",
  projeto: "Projeto",
  licenca: "Licença / Alvará",
  nota_fiscal: "Nota Fiscal",
  outro: "Outro"
};

const kb = (b: number) => b < 1024 * 1024
  ? `${Math.round(b / 1024)} KB`
  : `${(b / 1024 / 1024).toFixed(1)} MB`;

export default async function Documentos({
  params, searchParams
}: { params: { id: string }; searchParams: { salvo?: string; erro?: string } }) {
  const { data: docs } = await db
    .from("documentos").select("*").eq("obra_id", params.id)
    .order("criado_em", { ascending: false });
  const lista = docs ?? [];

  // agrupa por categoria
  const grupos: { cat: string; itens: typeof lista }[] = [];
  Object.keys(CATEGORIAS).forEach((cat) => {
    const itens = lista.filter((d) => d.categoria === cat);
    if (itens.length) grupos.push({ cat, itens });
  });

  return (
    <div className="space-y-5 max-w-3xl">
      {searchParams.salvo && (
        <p className="rounded-md bg-oksoft text-ok text-sm px-3 py-2">Documento enviado.</p>
      )}
      {searchParams.erro && (
        <p className="rounded-md bg-dangersoft text-danger text-sm px-3 py-2">
          {ERROS[searchParams.erro] ?? "Erro ao enviar."}
        </p>
      )}

      <details className="card group">
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none list-none">
          <span className="btn-brand !py-1.5 !px-3 text-xs">+ Enviar documento</span>
          <span className="text-sm text-steel">contrato, ART, projeto, alvará, nota fiscal…</span>
          <span className="ml-auto text-steel text-xs group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <form action={criarDocumento} className="px-4 pb-4 pt-4 grid md:grid-cols-2 gap-3 items-end border-t border-black/5">
          <input type="hidden" name="obra_id" value={params.id} />
          <div>
            <label className="label">Título</label>
            <input name="titulo" className="input" placeholder="Contrato assinado — Cliente" />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select name="categoria" className="input">
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Arquivo (PDF, imagem, Word, Excel…)</label>
            <input name="arquivo" type="file" required
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-graphite file:text-white file:px-3 file:py-2 file:text-sm file:cursor-pointer" />
          </div>
          <button className="btn-brand">Enviar</button>
        </form>
      </details>

      {lista.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-medium">Nenhum documento anexado</p>
          <p className="text-sm text-steel mt-1">
            Envie contratos, ARTs, projetos e alvarás em "Enviar documento" acima.
          </p>
        </div>
      )}

      {grupos.map((g) => (
        <section key={g.cat} className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-graphite text-white flex items-center gap-3">
            <span className="hazard h-3 w-8 rounded-sm shrink-0" />
            <h2 className="font-display font-semibold text-sm">{CATEGORIAS[g.cat]}</h2>
            <span className="text-xs text-white/50 ml-auto">{g.itens.length} arquivo(s)</span>
          </div>
          <div className="divide-y divide-black/5">
            {g.itens.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="flex-1 min-w-0">
                  <a href={`/api/documento?id=${d.id}`} target="_blank" rel="noopener noreferrer"
                    className="font-medium hover:text-brand">{d.titulo} ↗</a>
                  <p className="text-xs text-steel">
                    {d.nome_arquivo} · {kb(d.tamanho_bytes)} · {dataBR(d.criado_em?.slice(0, 10))}
                  </p>
                </div>
                <form action={excluirDocumento}>
                  <input type="hidden" name="obra_id" value={params.id} />
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="storage_path" value={d.storage_path} />
                  <button className="btn-ghost text-danger">Excluir</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
