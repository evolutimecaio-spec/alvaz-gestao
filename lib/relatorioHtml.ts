import type { Relatorio } from "./relatorio";

const brl = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

// HTML autocontido (estilos inline) — serve para o corpo do e-mail e para impressão.
export function relatorioParaHtml(r: Relatorio): string {
  const grupos = r.grupos
    .map((g) => {
      const linhas = g.itens
        .map(
          (e) => `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #eee">${e.servico}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;color:#555">${e.fim_real ? dataBR(e.fim_real) : "—"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${brl(e.medicao_valor)}</td>
          </tr>`
        )
        .join("");
      const fotos = g.midias.length
        ? `<p style="margin:6px 0 0;font-size:12px">Registros fotográficos: ${g.midias
            .map((m) => `<a href="${m.url}" style="color:#C2410C">${m.titulo}</a>`)
            .join(" · ")}</p>`
        : "";
      const subtotal = g.itens.reduce((s, e) => s + Number(e.medicao_valor || 0), 0);
      return `<div style="margin:18px 0">
        <h3 style="margin:0 0 6px;color:#1C2126;font-size:15px">${g.macro}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr>
            <th style="text-align:left;padding:6px 8px;background:#f4f1ea;color:#5A6570;font-size:11px;text-transform:uppercase">Serviço concluído</th>
            <th style="text-align:center;padding:6px 8px;background:#f4f1ea;color:#5A6570;font-size:11px;text-transform:uppercase">Conclusão</th>
            <th style="text-align:right;padding:6px 8px;background:#f4f1ea;color:#5A6570;font-size:11px;text-transform:uppercase">Valor medido</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
          <tfoot><tr>
            <td colspan="2" style="padding:6px 8px;text-align:right;font-weight:bold">Subtotal</td>
            <td style="padding:6px 8px;text-align:right;font-weight:bold">${brl(subtotal)}</td>
          </tr></tfoot>
        </table>
        ${fotos}
      </div>`;
    })
    .join("");

  const vazio = r.grupos.length === 0
    ? `<p style="color:#999">Nenhum serviço concluído no período selecionado.</p>`
    : "";

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;color:#23282C">
    <div style="background:repeating-linear-gradient(-45deg,#C2410C 0 10px,#1C2126 10px 20px);height:6px;border-radius:3px"></div>
    <div style="padding:8px 0 0">
      <h1 style="font-size:20px;margin:12px 0 2px">Relatório de Medição</h1>
      <p style="margin:0;color:#5A6570;font-size:13px">
        <strong>${r.obra.nome}</strong>${r.obra.endereco ? ` — ${r.obra.endereco}` : ""}<br>
        Cliente: ${r.cliente}${r.obra.rt_nome ? ` · RT: ${r.obra.rt_nome}` : ""}${r.obra.crea ? ` (CREA ${r.obra.crea})` : ""}<br>
        Período: ${dataBR(r.de)} a ${dataBR(r.ate)}
      </p>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:12px 0">
    ${grupos}${vazio}
    <div style="margin-top:18px;padding:12px;background:#f4f1ea;border-radius:6px;display:flex;justify-content:space-between">
      <span style="font-size:13px;color:#5A6570">${r.totalEtapas} serviço(s) medido(s) no período</span>
      <span style="font-size:16px;font-weight:bold;color:#C2410C">Total: ${brl(r.valorTotal)}</span>
    </div>
    <p style="margin-top:16px;color:#999;font-size:11px">Documento gerado pelo Alvaz - Gestão em ${dataBR(r.geradoEm)}.</p>
  </div>`;
}
