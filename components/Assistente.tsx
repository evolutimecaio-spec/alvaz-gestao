"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { executarAcaoAssistente } from "@/app/actions";

interface Msg { autor: "user" | "model"; texto: string; }
interface Acao { tipo: string; dados: Record<string, string | number>; }

const ROTULO_ACAO: Record<string, string> = {
  criar_cliente: "Criar cliente",
  criar_obra: "Criar obra",
  criar_etapa: "Adicionar etapa ao cronograma"
};
const ROTULO_CAMPO: Record<string, string> = {
  nome: "Nome", contato: "Contato", cpf_cnpj: "CPF/CNPJ", email: "E-mail",
  endereco: "Endereço", rt_nome: "RT", crea: "CREA", valor_fechado: "Valor do contrato",
  macroetapa: "Macroetapa", servico: "Serviço"
};

export default function Assistente() {
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [acao, setAcao] = useState<Acao | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // deduz contexto da URL: /obras/<id>/<tela>
  const obraMatch = pathname.match(/\/obras\/([0-9a-f-]{36})(?:\/(\w+))?/);
  const obraId = obraMatch?.[1];
  const tela = obraMatch?.[2] ?? pathname.replace("/", "") ?? "home";

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, acao]);

  async function enviar() {
    const t = texto.trim();
    if (!t || carregando) return;
    const novas = [...msgs, { autor: "user" as const, texto: t }];
    setMsgs(novas);
    setTexto("");
    setAcao(null);
    setCarregando(true);
    try {
      const r = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: novas,
          contexto: { obraId, tela }
        })
      });
      const data = await r.json();
      if (data.erro) {
        setMsgs((m) => [...m, { autor: "model", texto: `⚠️ ${data.erro}` }]);
      } else {
        setMsgs((m) => [...m, { autor: "model", texto: data.texto || "…" }]);
        if (data.acao?.tipo) setAcao(data.acao);
      }
    } catch {
      setMsgs((m) => [...m, { autor: "model", texto: "⚠️ Erro de conexão. Tente de novo." }]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button onClick={() => setAberto((a) => !a)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-brand text-white text-2xl shadow-lg hover:bg-[#a03509] transition-colors flex items-center justify-center"
        aria-label="Assistente">
        {aberto ? "×" : "?"}
      </button>

      {aberto && (
        <div className="fixed bottom-24 right-5 z-40 w-[min(400px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-8rem))] card flex flex-col overflow-hidden">
          <div className="hazard h-1.5 shrink-0" />
          <div className="px-4 py-3 border-b border-black/10 shrink-0">
            <p className="font-display font-semibold text-sm">Assistente Alvaz</p>
            <p className="text-[11px] text-steel">Tira dúvidas e te ajuda a cadastrar. Confira antes de confirmar.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.length === 0 && (
              <div className="text-sm text-steel space-y-2">
                <p>Oi! Posso te ajudar a usar o sistema e a cadastrar coisas. Experimente:</p>
                <ul className="space-y-1 text-xs">
                  <li>• "Como lanço uma medição?"</li>
                  <li>• "Cadastra o cliente João Silva, telefone 11 99999-0000"</li>
                  <li>• "Cria a obra Residência Vila Nova, contrato de 900 mil"</li>
                </ul>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`text-sm ${m.autor === "user" ? "text-right" : ""}`}>
                <div className={`inline-block rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap text-left ${
                  m.autor === "user" ? "bg-graphite text-white" : "bg-concrete"
                }`}>{m.texto}</div>
              </div>
            ))}

            {/* Cartão de confirmação da ação proposta */}
            {acao && (
              <div className="rounded-lg border-2 border-brand/40 bg-brandsoft p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-2">
                  {ROTULO_ACAO[acao.tipo] ?? acao.tipo}
                </p>
                <div className="space-y-1 text-sm mb-3">
                  {Object.entries(acao.dados)
                    .filter(([, v]) => String(v).trim() !== "" && String(v) !== "0")
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-steel">{ROTULO_CAMPO[k] ?? k}</span>
                        <span className="font-medium text-right">{String(v)}</span>
                      </div>
                    ))}
                </div>
                <form action={executarAcaoAssistente} className="flex gap-2">
                  <input type="hidden" name="tipo" value={acao.tipo} />
                  <input type="hidden" name="dados" value={JSON.stringify(acao.dados)} />
                  <input type="hidden" name="obra_ctx" value={obraId ?? ""} />
                  <button className="btn-brand flex-1 justify-center text-sm">Confirmar e criar</button>
                  <button type="button" onClick={() => setAcao(null)} className="btn-ghost">Cancelar</button>
                </form>
              </div>
            )}

            {carregando && <p className="text-xs text-steel">Pensando…</p>}
            <div ref={fimRef} />
          </div>

          <div className="p-3 border-t border-black/10 shrink-0 flex gap-2">
            <input value={texto} onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } }}
              placeholder="Escreva sua mensagem…" className="input flex-1" />
            <button onClick={enviar} disabled={carregando} className="btn-brand">Enviar</button>
          </div>
        </div>
      )}
    </>
  );
}
