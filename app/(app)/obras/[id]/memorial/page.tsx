import { processarMemorial } from "@/app/actions";

const ERROS: Record<string, string> = {
  api: "Falha na chamada à API. Verifique a ANTHROPIC_API_KEY nas variáveis de ambiente.",
  parse: "Não foi possível interpretar a resposta. Tente novamente ou simplifique o texto.",
  vazio: "Nenhuma etapa foi identificada no texto enviado."
};

export default function Memorial({
  params, searchParams
}: { params: { id: string }; searchParams: { erro?: string } }) {
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="font-display font-semibold text-lg">Motor de Memorial Descritivo</h2>
        <p className="text-sm text-steel">
          Cole o texto do Memorial Descritivo abaixo. O sistema ignora trechos narrativos e
          jurídicos e extrai as macroetapas e serviços, criando as linhas do cronograma
          automaticamente. Depois, ajuste datas e custos na aba Cronograma.
        </p>
      </div>
      {searchParams.erro && (
        <p className="rounded-md bg-dangersoft text-danger text-sm px-3 py-2">
          {ERROS[searchParams.erro] ?? "Erro ao processar."}
        </p>
      )}
      <form action={processarMemorial} className="card p-4 space-y-3">
        <input type="hidden" name="obra_id" value={params.id} />
        <textarea name="texto" rows={16} required className="input font-mono text-xs"
          placeholder={"1. SERVIÇOS PRELIMINARES\n1.1 Limpeza do terreno…\n1.2 Instalação do canteiro…\n\n2. FUNDAÇÕES\n2.1 Estacas hélice contínua ø30cm…"} />
        <button className="btn-brand">Processar memorial e gerar escopo</button>
      </form>
    </div>
  );
}
