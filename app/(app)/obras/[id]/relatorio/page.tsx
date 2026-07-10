import { db } from "@/lib/db";
import { montarRelatorio } from "@/lib/relatorio";
import { relatorioParaHtml } from "@/lib/relatorioHtml";
import { hojeISO } from "@/lib/status";
import { enviarRelatorioMedicao } from "@/app/actions";
import ImprimirBtn from "@/components/ImprimirBtn";

export const dynamic = "force-dynamic";

export default async function Relatorio({
  params, searchParams
}: {
  params: { id: string };
  searchParams: { de?: string; ate?: string; enviado?: string; erro?: string };
}) {
  const hoje = hojeISO();
  const primeiroDoMes = hoje.slice(0, 8) + "01";
  const de = searchParams.de || primeiroDoMes;
  const ate = searchParams.ate || hoje;

  const [{ data: obra }, { data: etapas }, { data: midias }] = await Promise.all([
    db.from("obras").select("nome, endereco, rt_nome, crea, clientes(nome, email)").eq("id", params.id).single(),
    db.from("etapas").select("*").eq("obra_id", params.id).order("ordem"),
    db.from("midias").select("titulo, url, tipo, etapa_id").eq("obra_id", params.id)
  ]);

  const cliente = Array.isArray(obra?.clientes) ? obra?.clientes[0] : obra?.clientes;
  const rel = montarRelatorio(
    { nome: obra?.nome ?? "", endereco: obra?.endereco ?? null, rt_nome: obra?.rt_nome ?? null, crea: obra?.crea ?? null },
    cliente?.nome ?? "—",
    (etapas ?? []) as never,
    (midias ?? []) as never,
    de,
    ate
  );
  const html = relatorioParaHtml(rel);
  const assunto = `Relatório de Medição — ${obra?.nome} (${de} a ${ate})`;

  return (
    <div className="space-y-4">
      {searchParams.enviado && (
        <p className="rounded-md bg-oksoft text-ok text-sm px-3 py-2 print:hidden">
          Relatório enviado por e-mail com sucesso.
        </p>
      )}
      {searchParams.erro && (
        <p className="rounded-md bg-dangersoft text-danger text-sm px-3 py-2 print:hidden">
          {searchParams.erro === "envio"
            ? "Falha ao enviar. Verifique a RESEND_API_KEY e o e-mail de destino."
            : "Preencha o e-mail de destino."}
        </p>
      )}

      <form method="get" className="card p-4 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="label">De</label>
          <input type="date" name="de" defaultValue={de} className="input" />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" name="ate" defaultValue={ate} className="input" />
        </div>
        <button className="btn">Gerar período</button>
        <div className="ml-auto flex gap-2">
          <ImprimirBtn />
        </div>
      </form>

      <form action={enviarRelatorioMedicao} className="card p-4 flex flex-wrap items-end gap-3 print:hidden">
        <input type="hidden" name="obra_id" value={params.id} />
        <input type="hidden" name="de" value={de} />
        <input type="hidden" name="ate" value={ate} />
        <input type="hidden" name="html" value={html} />
        <input type="hidden" name="assunto" value={assunto} />
        <div className="flex-1 min-w-[240px]">
          <label className="label">Enviar por e-mail para</label>
          <input type="email" name="para" required defaultValue={cliente?.email ?? ""}
            className="input" placeholder="cliente@exemplo.com" />
        </div>
        <button className="btn-brand">Enviar ao cliente</button>
      </form>

      {/* pré-visualização (mesmo HTML do e-mail) */}
      <div className="card p-6 bg-white">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
