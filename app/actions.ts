"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hojeISO } from "@/lib/status";

const COOKIE = "cs_session";
const num = (v: FormDataEntryValue | null) => {
  const n = parseFloat(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const str = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

// ============================================================ AUTH
// Senha única de acesso. Defina ADMIN_PASSWORD na Vercel para sobrescrever
// o padrão abaixo (recomendado, para não deixar a senha no código do repo).
const SENHA_ADMIN = process.env.ADMIN_PASSWORD || "Alvaz2026@";

export async function loginAction(fd: FormData) {
  const senha = String(fd.get("senha") ?? "");
  if (senha !== SENHA_ADMIN) {
    redirect("/login?erro=1");
  }
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await db.from("sessoes").insert({ token, expira_em: expira });
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 3600,
    path: "/"
  });
  redirect("/");
}

export async function logoutAction() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await db.from("sessoes").delete().eq("token", token);
  cookies().delete(COOKIE);
  redirect("/login");
}

// ============================================================ CADASTROS
export async function criarCliente(fd: FormData) {
  await db.from("clientes").insert({
    nome: str(fd.get("nome")),
    contato: str(fd.get("contato")),
    email: str(fd.get("email")),
    cpf_cnpj: str(fd.get("cpf_cnpj"))
  });
  revalidatePath("/clientes");
  revalidatePath("/obras/nova");
  revalidatePath("/", "layout");
}

export async function criarObra(fd: FormData) {
  const { data } = await db
    .from("obras")
    .insert({
      nome: str(fd.get("nome")),
      endereco: str(fd.get("endereco")),
      rt_nome: str(fd.get("rt_nome")),
      crea: str(fd.get("crea")),
      cliente_id: str(fd.get("cliente_id"))
    })
    .select("id")
    .single();
  const valor = num(fd.get("valor_fechado"));
  const escopo = str(fd.get("escopo_resumo"));
  const condicoes = str(fd.get("condicoes"));
  if (data && (valor || escopo || condicoes)) {
    await db.from("contratos").insert({
      obra_id: data.id,
      valor_fechado: valor,
      escopo_resumo: escopo,
      condicoes
    });
  }
  revalidatePath("/obras");
  redirect(data ? `/obras/${data.id}` : "/obras");
}

export async function atualizarStatusObra(fd: FormData) {
  const id = String(fd.get("obra_id"));
  await db.from("obras").update({ status: str(fd.get("status")) }).eq("id", id);
  revalidatePath(`/obras/${id}`);
  revalidatePath("/obras");
}

// Editar dados cadastrais da obra + contrato (upsert do contrato)
export async function atualizarObra(fd: FormData) {
  const id = String(fd.get("obra_id"));
  await db.from("obras").update({
    nome: str(fd.get("nome")),
    endereco: str(fd.get("endereco")),
    rt_nome: str(fd.get("rt_nome")),
    crea: str(fd.get("crea")),
    cliente_id: str(fd.get("cliente_id"))
  }).eq("id", id);

  // contrato: atualiza o existente ou cria se não houver
  const valor = num(fd.get("valor_fechado"));
  const escopo = str(fd.get("escopo_resumo"));
  const condicoes = str(fd.get("condicoes"));
  const contratoId = str(fd.get("contrato_id"));
  if (contratoId) {
    await db.from("contratos").update({
      valor_fechado: valor, escopo_resumo: escopo, condicoes
    }).eq("id", contratoId);
  } else if (valor || escopo || condicoes) {
    await db.from("contratos").insert({
      obra_id: id, valor_fechado: valor, escopo_resumo: escopo, condicoes
    });
  }
  revalidatePath(`/obras/${id}`, "layout");
  revalidatePath("/obras");
  redirect(`/obras/${id}/editar?salvo=1`);
}

// ============================================================ ADITIVOS
export async function criarAditivo(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  await db.from("aditivos").insert({
    obra_id: obraId,
    descricao: str(fd.get("descricao")),
    valor: num(fd.get("valor")),
    impacto_prazo_dias: parseInt(String(fd.get("impacto_prazo_dias") || "0")) || 0
  });
  revalidatePath(`/obras/${obraId}/aditivos`);
}

export async function atualizarAditivo(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  await db
    .from("aditivos")
    .update({ status: str(fd.get("status")) })
    .eq("id", String(fd.get("id")));
  revalidatePath(`/obras/${obraId}/aditivos`);
  revalidatePath(`/obras/${obraId}`);
}

// ============================================================ CRONOGRAMA
export async function criarEtapa(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  const { data: last } = await db
    .from("etapas")
    .select("ordem")
    .eq("obra_id", obraId)
    .order("ordem", { ascending: false })
    .limit(1);
  await db.from("etapas").insert({
    obra_id: obraId,
    macroetapa: str(fd.get("macroetapa")) ?? "Geral",
    servico: str(fd.get("servico")) ?? "Serviço",
    ordem: (last?.[0]?.ordem ?? 0) + 1,
    inicio_previsto: str(fd.get("inicio_previsto")),
    fim_previsto: str(fd.get("fim_previsto")),
    custo_previsto: num(fd.get("custo_previsto"))
  });
  revalidatePath(`/obras/${obraId}/cronograma`);
}

export async function atualizarEtapa(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  await db
    .from("etapas")
    .update({
      inicio_previsto: str(fd.get("inicio_previsto")),
      fim_previsto: str(fd.get("fim_previsto")),
      inicio_real: str(fd.get("inicio_real")),
      fim_real: str(fd.get("fim_real")),
      custo_previsto: num(fd.get("custo_previsto")),
      custo_real: num(fd.get("custo_real")),
      medicao_status: str(fd.get("medicao_status")) ?? "sem_medicao",
      medicao_link: str(fd.get("medicao_link")),
      medicao_valor: num(fd.get("medicao_valor")),
      justificativa_atraso: str(fd.get("justificativa_atraso"))
    })
    .eq("id", String(fd.get("id")));
  revalidatePath(`/obras/${obraId}/cronograma`);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/obras/${obraId}/kanban`);
}

export async function excluirEtapa(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  await db.from("etapas").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/obras/${obraId}/cronograma`);
}

// Movimentação do Kanban (drag & drop) — mapeia coluna → datas/medição
export async function moverKanban(etapaId: string, obraId: string, coluna: string) {
  const hoje = hojeISO();
  const patch: Record<string, unknown> = {};
  switch (coluna) {
    case "a_iniciar":
      patch.inicio_real = null;
      patch.fim_real = null;
      break;
    case "em_andamento":
      patch.inicio_real = hoje;
      patch.fim_real = null;
      break;
    case "concluido_sem_medicao":
      patch.fim_real = hoje;
      patch.medicao_status = "sem_medicao";
      break;
    case "medida_pendente":
      patch.fim_real = hoje;
      patch.medicao_status = "medida_pendente";
      break;
    case "medida_paga":
      patch.fim_real = hoje;
      patch.medicao_status = "medida_paga";
      break;
  }
  // garante coerência: concluir sem ter iniciado preenche o início
  if (patch.fim_real) {
    const { data } = await db.from("etapas").select("inicio_real").eq("id", etapaId).single();
    if (data && !data.inicio_real) patch.inicio_real = hoje;
  }
  await db.from("etapas").update(patch).eq("id", etapaId);
  revalidatePath(`/obras/${obraId}/kanban`);
  revalidatePath(`/obras/${obraId}/cronograma`);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/kanban");
  revalidatePath("/");
}

// ============================================================ SUPRIMENTOS
export async function criarCompra(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  await db.from("compras").insert({
    obra_id: obraId,
    etapa_id: str(fd.get("etapa_id")),
    material: str(fd.get("material")) ?? "Material",
    fornecedor: str(fd.get("fornecedor")),
    quantidade: str(fd.get("quantidade")),
    valor: num(fd.get("valor")),
    data_pedido: str(fd.get("data_pedido")),
    data_necessaria: str(fd.get("data_necessaria")),
    data_entrega_prevista: str(fd.get("data_entrega_prevista"))
  });
  revalidatePath(`/obras/${obraId}/financeiro`);
}

export async function atualizarCompra(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  await db
    .from("compras")
    .update({
      status: str(fd.get("status")),
      status_pagamento: str(fd.get("status_pagamento")),
      data_entrega_real: str(fd.get("data_entrega_real"))
    })
    .eq("id", String(fd.get("id")));
  revalidatePath(`/obras/${obraId}/financeiro`);
  revalidatePath("/");
}

// ============================================================ RDO
export async function criarRDO(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  await db.from("rdos").upsert(
    {
      obra_id: obraId,
      data: str(fd.get("data")) ?? hojeISO(),
      clima: str(fd.get("clima")),
      dia_perdido_chuva: fd.get("dia_perdido_chuva") === "on",
      efetivo: parseInt(String(fd.get("efetivo") || "0")) || 0,
      relato: str(fd.get("relato"))
    },
    { onConflict: "obra_id,data" }
  );
  revalidatePath(`/obras/${obraId}/rdo`);
  revalidatePath("/");
}

// ============================================================ MÍDIAS
export async function criarMidia(fd: FormData) {
  const obraId = String(fd.get("obra_id"));
  await db.from("midias").insert({
    obra_id: obraId,
    etapa_id: str(fd.get("etapa_id")),
    titulo: str(fd.get("titulo")) ?? "Mídia",
    url: str(fd.get("url")) ?? "",
    tipo: str(fd.get("tipo")) ?? "foto"
  });
  revalidatePath(`/obras/${obraId}/midias`);
}

// ============================================================ MEMORIAL DESCRITIVO
// Núcleo reutilizável: recebe texto, extrai etapas via Gemini e insere no banco.
// Retorna a quantidade de etapas criadas, ou lança string de erro conhecida.
async function extrairEInserirEtapas(obraId: string, texto: string): Promise<number> {
  const limpo = texto.slice(0, 60000).trim();
  if (!limpo) throw "vazio";

  const prompt =
    "Você é um motor de extração de escopo de obras de engenharia civil. " +
    "A seguir está o texto de um Memorial Descritivo. Ignore textos narrativos, " +
    "jurídicos ou irrelevantes. Extraia as MACROETAPAS (títulos/capítulos) e os " +
    "SERVIÇOS/especificações executáveis vinculados a cada uma. Cada serviço deve ser " +
    "uma linha executável e medível do cronograma. Responda SOMENTE com JSON válido, " +
    'sem markdown, no formato exato: {"etapas":[{"macroetapa":"...","servico":"..."}]}.\n\n' +
    "MEMORIAL:\n" +
    limpo;

  const modelo = "gemini-2.0-flash";
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    }
  );
  if (!resp.ok) throw "api";

  const data = await resp.json();
  const raw = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("\n")
    .replace(/```json|```/g, "")
    .trim();

  let etapas: { macroetapa: string; servico: string }[] = [];
  try {
    etapas = JSON.parse(raw).etapas ?? [];
  } catch {
    throw "parse";
  }
  if (!etapas.length) throw "vazio";

  const { data: last } = await db
    .from("etapas").select("ordem").eq("obra_id", obraId)
    .order("ordem", { ascending: false }).limit(1);
  let ordem = last?.[0]?.ordem ?? 0;

  await db.from("etapas").insert(
    etapas.map((e) => ({
      obra_id: obraId,
      macroetapa: (e.macroetapa || "Geral").slice(0, 200),
      servico: (e.servico || "Serviço").slice(0, 500),
      ordem: ++ordem
    }))
  );
  return etapas.length;
}

// Entrada 1: colar texto
export async function processarMemorial(fd: FormData): Promise<void> {
  const obraId = String(fd.get("obra_id"));
  const texto = String(fd.get("texto") ?? "");
  if (!texto.trim()) return;

  let n: number;
  try {
    n = await extrairEInserirEtapas(obraId, texto);
  } catch (e) {
    redirect(`/obras/${obraId}/memorial?erro=${typeof e === "string" ? e : "api"}`);
  }
  revalidatePath(`/obras/${obraId}/cronograma`);
  redirect(`/obras/${obraId}/cronograma?memorial=${n}`);
}

// Entrada 2: upload de arquivo (PDF ou .docx). Extrai o texto e reusa o núcleo.
export async function processarMemorialArquivo(fd: FormData): Promise<void> {
  const obraId = String(fd.get("obra_id"));
  const file = fd.get("arquivo") as File | null;
  if (!file || file.size === 0) redirect(`/obras/${obraId}/memorial?erro=arquivo`);

  const nome = (file!.name || "").toLowerCase();
  const buffer = Buffer.from(await file!.arrayBuffer());
  let texto = "";

  try {
    if (nome.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true
      }).promise;
      const partes: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        partes.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
      }
      texto = partes.join("\n");
    } else if (nome.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const out = await mammoth.extractRawText({ buffer });
      texto = out.value ?? "";
    } else {
      redirect(`/obras/${obraId}/memorial?erro=formato`);
    }
  } catch {
    redirect(`/obras/${obraId}/memorial?erro=leitura`);
  }

  // PDF escaneado / sem texto extraível
  if (texto.replace(/\s/g, "").length < 40) {
    redirect(`/obras/${obraId}/memorial?erro=escaneado`);
  }

  let n: number;
  try {
    n = await extrairEInserirEtapas(obraId, texto);
  } catch (e) {
    redirect(`/obras/${obraId}/memorial?erro=${typeof e === "string" ? e : "api"}`);
  }
  revalidatePath(`/obras/${obraId}/cronograma`);
  redirect(`/obras/${obraId}/cronograma?memorial=${n}`);
}

// ============================================================ RELATÓRIO DE MEDIÇÃO
// Envia o relatório do período por e-mail (Resend) para o cliente ou para você.
export async function enviarRelatorioMedicao(fd: FormData): Promise<void> {
  const obraId = String(fd.get("obra_id"));
  const de = String(fd.get("de"));
  const ate = String(fd.get("ate"));
  const para = String(fd.get("para") || "").trim();
  const htmlCorpo = String(fd.get("html") || "");
  const assunto = String(fd.get("assunto") || "Relatório de Medição");

  if (!para || !htmlCorpo) redirect(`/obras/${obraId}/relatorio?erro=dados`);

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.ALERT_EMAIL_FROM,
      to: [para],
      subject: assunto,
      html: htmlCorpo
    })
  });
  redirect(`/obras/${obraId}/relatorio?${resp.ok ? "enviado=1" : "erro=envio"}&de=${de}&ate=${ate}`);
}

// ============================================================ DOCUMENTOS
export async function criarDocumento(fd: FormData): Promise<void> {
  const obraId = String(fd.get("obra_id"));
  const file = fd.get("arquivo") as File | null;
  const titulo = str(fd.get("titulo"));
  const categoria = str(fd.get("categoria")) ?? "outro";
  if (!file || file.size === 0) redirect(`/obras/${obraId}/documentos?erro=arquivo`);

  const { BUCKET } = await import("@/lib/storage");
  const ext = (file!.name.split(".").pop() || "bin").toLowerCase();
  const path = `${obraId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(await file!.arrayBuffer());

  const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: file!.type || "application/octet-stream",
    upsert: false
  });
  if (error) {
    redirect(`/obras/${obraId}/documentos?erro=upload`);
  }

  await db.from("documentos").insert({
    obra_id: obraId,
    titulo: titulo ?? file!.name,
    categoria,
    storage_path: path,
    nome_arquivo: file!.name,
    tamanho_bytes: file!.size
  });
  revalidatePath(`/obras/${obraId}/documentos`);
  redirect(`/obras/${obraId}/documentos?salvo=1`);
}

export async function excluirDocumento(fd: FormData): Promise<void> {
  const obraId = String(fd.get("obra_id"));
  const id = String(fd.get("id"));
  const path = String(fd.get("storage_path"));
  const { BUCKET } = await import("@/lib/storage");
  await db.storage.from(BUCKET).remove([path]);
  await db.from("documentos").delete().eq("id", id);
  revalidatePath(`/obras/${obraId}/documentos`);
}

// ============================================================ ASSISTENTE — executar ação confirmada
// Recebe o JSON proposto pela IA (já confirmado pelo usuário no cartão) e cria o registro.
export async function executarAcaoAssistente(fd: FormData): Promise<void> {
  const tipo = String(fd.get("tipo"));
  const dadosRaw = String(fd.get("dados") || "{}");
  const obraCtx = str(fd.get("obra_ctx"));
  let d: Record<string, unknown> = {};
  try { d = JSON.parse(dadosRaw); } catch { d = {}; }
  const s = (k: string) => {
    const v = d[k];
    return v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim();
  };
  const n = (k: string) => {
    const v = parseFloat(String(d[k] ?? "").replace(/\./g, "").replace(",", "."));
    return isNaN(v) ? 0 : v;
  };

  if (tipo === "criar_cliente") {
    await db.from("clientes").insert({
      nome: s("nome") ?? "Cliente", contato: s("contato"),
      email: s("email"), cpf_cnpj: s("cpf_cnpj")
    });
    revalidatePath("/clientes"); revalidatePath("/obras/nova"); revalidatePath("/", "layout");
    redirect("/clientes");
  }

  if (tipo === "criar_obra") {
    const { data: nova } = await db.from("obras").insert({
      nome: s("nome") ?? "Nova obra", endereco: s("endereco"),
      rt_nome: s("rt_nome"), crea: s("crea")
    }).select("id").single();
    if (nova && n("valor_fechado")) {
      await db.from("contratos").insert({ obra_id: nova.id, valor_fechado: n("valor_fechado") });
    }
    revalidatePath("/obras"); revalidatePath("/", "layout");
    redirect(nova ? `/obras/${nova.id}` : "/obras");
  }

  if (tipo === "criar_etapa" && obraCtx) {
    const { data: last } = await db.from("etapas").select("ordem")
      .eq("obra_id", obraCtx).order("ordem", { ascending: false }).limit(1);
    await db.from("etapas").insert({
      obra_id: obraCtx,
      macroetapa: s("macroetapa") ?? "Geral",
      servico: s("servico") ?? "Serviço",
      ordem: (last?.[0]?.ordem ?? 0) + 1
    });
    revalidatePath(`/obras/${obraCtx}/cronograma`);
    redirect(`/obras/${obraCtx}/cronograma`);
  }

  // tipo desconhecido ou sem contexto necessário
  redirect("/");
}
