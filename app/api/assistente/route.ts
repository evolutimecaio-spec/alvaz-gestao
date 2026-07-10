import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Descreve as ações que o assistente pode PROPOR (nunca executa sozinho).
const SISTEMA = `Você é o assistente do "Alvaz - Gestão", um sistema de gestão de obras de engenharia civil.
Ajuda o usuário a entender o sistema e a cadastrar dados. Seja direto, prático e use português do Brasil.

O sistema tem: Clientes, Obras (com Contrato), Cronograma (etapas com macroetapa e serviço),
Financeiro/Suprimentos, Diário de Obra (RDO), Aditivos, Documentos, Mídias e Relatório de Medição.

Quando o usuário PEDIR para cadastrar algo que você consegue estruturar, além da sua resposta em
texto, inclua NO FINAL um bloco de ação no formato exato:
<acao>{"tipo":"criar_cliente","dados":{"nome":"...","contato":"...","cpf_cnpj":"..."}}</acao>
ou
<acao>{"tipo":"criar_obra","dados":{"nome":"...","endereco":"...","rt_nome":"...","crea":"...","valor_fechado":0}}</acao>
ou
<acao>{"tipo":"criar_etapa","dados":{"macroetapa":"...","servico":"..."}}</acao>

Regras do bloco de ação:
- Só inclua <acao> quando o usuário claramente quer criar algo E você tem informação suficiente.
- Use apenas os campos que o usuário forneceu; deixe os demais como string vazia ou 0.
- Nunca invente CPF, valores ou dados que o usuário não deu.
- Se faltar o essencial (ex.: nome), NÃO gere ação; pergunte o que falta.
- Escreva sempre uma frase em texto antes do bloco, explicando o que preparou.
- No máximo um bloco <acao> por resposta.`;

export async function POST(req: NextRequest) {
  const sessao = await getSession();
  if (!sessao) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const { mensagens, contexto } = await req.json();
  if (!Array.isArray(mensagens)) {
    return NextResponse.json({ erro: "formato inválido" }, { status: 400 });
  }

  // contexto da tela: se estamos numa obra, injeta um resumo dela
  let ctx = "";
  if (contexto?.obraId) {
    const { data: obra } = await db
      .from("obras").select("nome, endereco, status").eq("id", contexto.obraId).single();
    if (obra) ctx = `\n\nContexto atual: o usuário está na obra "${obra.nome}" (${obra.status}).`;
  }
  if (contexto?.tela) ctx += `\nTela atual: ${contexto.tela}.`;

  const contents = mensagens.map((m: { autor: string; texto: string }) => ({
    role: m.autor === "user" ? "user" : "model",
    parts: [{ text: m.texto }]
  }));

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SISTEMA + ctx }] },
        contents,
        generationConfig: { temperature: 0.4 }
      })
    }
  );

  if (!resp.ok) {
    return NextResponse.json({ erro: "Falha ao falar com a IA. Verifique a GEMINI_API_KEY." }, { status: 502 });
  }
  const data = await resp.json();
  const texto = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "").join("").trim();

  // separa o bloco de ação (se houver) do texto visível
  let acao = null;
  const m = texto.match(/<acao>([\s\S]*?)<\/acao>/);
  let visivel = texto;
  if (m) {
    visivel = texto.replace(m[0], "").trim();
    try { acao = JSON.parse(m[1].trim()); } catch { acao = null; }
  }

  return NextResponse.json({ texto: visivel, acao });
}
