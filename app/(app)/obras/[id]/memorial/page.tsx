import { processarMemorial, processarMemorialArquivo } from "@/app/actions";

const ERROS: Record<string, string> = {
  api: "Falha na chamada ao Gemini. Confira a GEMINI_API_KEY nas variáveis de ambiente.",
  parse: "Não consegui interpretar a resposta da IA. Tente novamente.",
  vazio: "Nenhuma etapa foi identificada no memorial enviado.",
  arquivo: "Nenhum arquivo selecionado.",
  formato: "Formato não suportado. Envie um PDF ou um Word (.docx).",
  leitura: "Não consegui ler o arquivo. Ele pode estar corrompido ou protegido.",
  escaneado:
    "O arquivo Word está vazio ou sem texto. Cole o conteúdo no campo abaixo."
};

export const dynamic = "force-dynamic";

export default function Memorial({
  params, searchParams
}: { params: { id: string }; searchParams: { erro?: string } }) {
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="font-display font-semibold text-lg">Motor de Memorial Descritivo</h2>
        <p className="text-sm text-steel">
          Envie o memorial (PDF ou Word) ou cole o texto. O sistema ignora trechos narrativos e
          jurídicos, extrai as macroetapas e serviços e cria as linhas do cronograma
          automaticamente. Depois é só ajustar datas e custos.
        </p>
      </div>

      {searchParams.erro && (
        <p className="rounded-md bg-dangersoft text-danger text-sm px-3 py-2">
          {ERROS[searchParams.erro] ?? "Erro ao processar."}
        </p>
      )}

      {/* Opção A — upload de arquivo */}
      <form action={processarMemorialArquivo} className="card p-4 space-y-3">
        <input type="hidden" name="obra_id" value={params.id} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">
          Enviar arquivo (PDF ou .docx)
        </p>
        <input name="arquivo" type="file" accept=".pdf,.docx" required
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-graphite file:text-white file:px-3 file:py-2 file:text-sm file:cursor-pointer" />
        <button className="btn-brand">Processar arquivo e gerar escopo</button>
        <p className="text-[11px] text-steel">
          PDF (mesmo escaneado) e Word são lidos automaticamente pela IA.
        </p>
      </form>

      {/* Opção B — colar texto */}
      <form action={processarMemorial} className="card p-4 space-y-3">
        <input type="hidden" name="obra_id" value={params.id} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">
          Ou colar o texto
        </p>
        <textarea name="texto" rows={12} className="input font-mono text-xs"
          placeholder={"1. SERVIÇOS PRELIMINARES\n1.1 Limpeza do terreno…\n1.2 Instalação do canteiro…\n\n2. FUNDAÇÕES\n2.1 Estacas hélice contínua ø30cm…"} />
        <button className="btn">Processar texto e gerar escopo</button>
      </form>
    </div>
  );
}
