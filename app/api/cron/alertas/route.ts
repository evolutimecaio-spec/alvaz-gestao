import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { statusExecucao, desvioDias, hojeISO } from "@/lib/status";

export const dynamic = "force-dynamic";

// Chamado 1x/dia pelo cron-job.org:
// GET https://SEU-APP.vercel.app/api/cron/alertas?key=CRON_SECRET
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== process.env.CRON_SECRET) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const hoje = hojeISO();
  const ontem = new Date(new Date(hoje).getTime() - 86400000).toISOString().slice(0, 10);
  const em7 = new Date(new Date(hoje).getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const { data: obras } = await db.from("obras").select("id, nome").eq("status", "ativa");
  const ids = (obras ?? []).map((o) => o.id);
  const nome = new Map((obras ?? []).map((o) => [o.id, o.nome]));
  if (!ids.length) return NextResponse.json({ ok: true, msg: "sem obras ativas" });

  const [{ data: etapas }, { data: compras }, { data: rdos }] = await Promise.all([
    db.from("etapas").select("*").in("obra_id", ids),
    db.from("compras").select("*").in("obra_id", ids).neq("status", "entregue"),
    db.from("rdos").select("obra_id").in("obra_id", ids).eq("data", ontem)
  ]);

  const atrasadas = (etapas ?? []).filter((e) =>
    ["atrasado", "em_andamento_atrasado"].includes(statusExecucao(e, hoje))
  );
  const semMedicao = (etapas ?? []).filter(
    (e) => statusExecucao(e, hoje) === "concluido" && e.medicao_status === "sem_medicao"
  );
  const comprasCriticas = (compras ?? []).filter((c) => c.data_necessaria && c.data_necessaria <= em7);
  const comRdo = new Set((rdos ?? []).map((r) => r.obra_id));
  const rdoFaltando = (obras ?? []).filter((o) => !comRdo.has(o.id));

  const totalPendencias =
    atrasadas.length + semMedicao.length + comprasCriticas.length + rdoFaltando.length;
  if (totalPendencias === 0) return NextResponse.json({ ok: true, msg: "sem pendências hoje" });

  const li = (t: string) => `<li style="margin:4px 0">${t}</li>`;
  const secao = (titulo: string, itens: string[]) =>
    itens.length
      ? `<h3 style="margin:16px 0 6px;color:#1C2126">${titulo} (${itens.length})</h3><ul style="padding-left:18px;color:#333">${itens.join("")}</ul>`
      : "";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px">
      <div style="background:repeating-linear-gradient(-45deg,#C2410C 0 10px,#1C2126 10px 20px);height:6px;border-radius:3px"></div>
      <h2 style="color:#1C2126">Alvaz - Gestão — Pendências de hoje</h2>
      ${secao("⛔ Etapas atrasadas", atrasadas.map((e) =>
        li(`<b>${e.servico}</b> — ${nome.get(e.obra_id)} (+${desvioDias(e, hoje)} dias)`)))}
      ${secao("📏 Concluídas sem medição", semMedicao.map((e) =>
        li(`<b>${e.servico}</b> — ${nome.get(e.obra_id)}`)))}
      ${secao("🚚 Compras críticas (7 dias)", comprasCriticas.map((c) =>
        li(`<b>${c.material}</b> — ${nome.get(c.obra_id)}, necessário em ${c.data_necessaria}`)))}
      ${secao("📓 RDO de ontem faltando", rdoFaltando.map((o) => li(`<b>${o.nome}</b>`)))}
      <p style="color:#888;font-size:12px;margin-top:20px">Enviado automaticamente pelo Alvaz - Gestão.</p>
    </div>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.ALERT_EMAIL_FROM,
      to: [process.env.ALERT_EMAIL_TO],
      subject: `Alvaz - Gestão · ${totalPendencias} pendência(s) hoje`,
      html
    })
  });

  return NextResponse.json({
    ok: resp.ok,
    pendencias: {
      atrasadas: atrasadas.length,
      semMedicao: semMedicao.length,
      comprasCriticas: comprasCriticas.length,
      rdoFaltando: rdoFaltando.length
    }
  });
}
