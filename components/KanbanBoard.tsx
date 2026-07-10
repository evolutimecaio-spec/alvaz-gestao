"use client";

import { useTransition, useState } from "react";
import { moverKanban } from "@/app/actions";

export interface KanbanCard {
  id: string;
  obra_id: string;
  obra_nome?: string;
  macroetapa: string;
  servico: string;
  coluna: string;
  desvio: number;
  medicao_link: string | null;
}

const COLUNAS: { id: string; titulo: string; cor: string }[] = [
  { id: "a_iniciar", titulo: "A Iniciar", cor: "border-t-steel" },
  { id: "em_andamento", titulo: "Em Andamento", cor: "border-t-info" },
  { id: "em_andamento_atrasado", titulo: "Em Andamento (Atrasado)", cor: "border-t-warn" },
  { id: "concluido_sem_medicao", titulo: "Concluído · Medição Pendente", cor: "border-t-danger" },
  { id: "medida_pendente", titulo: "Medido · Aguard. Pgto", cor: "border-t-warn" },
  { id: "medida_paga", titulo: "Pago", cor: "border-t-ok" }
];

// arrastar para a coluna "atrasado" equivale a marcar como em andamento
// (o atraso é calculado automaticamente pelas datas previstas)
const destino = (col: string) => (col === "em_andamento_atrasado" ? "em_andamento" : col);

export default function KanbanBoard({ cards }: { cards: KanbanCard[] }) {
  const [pending, start] = useTransition();
  const [otimista, setOtimista] = useState<Record<string, string>>({});
  const [sobre, setSobre] = useState<string | null>(null);

  const colunaDe = (c: KanbanCard) => otimista[c.id] ?? c.coluna;

  function soltar(colId: string, ev: React.DragEvent) {
    ev.preventDefault();
    setSobre(null);
    const id = ev.dataTransfer.getData("text/plain");
    const card = cards.find((c) => c.id === id);
    if (!card || colunaDe(card) === colId) return;
    setOtimista((o) => ({ ...o, [id]: colId }));
    start(() => moverKanban(id, card.obra_id, destino(colId)));
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3" aria-busy={pending}>
      {COLUNAS.map((col) => {
        const itens = cards.filter((c) => colunaDe(c) === col.id);
        return (
          <div key={col.id}
            onDragOver={(e) => { e.preventDefault(); setSobre(col.id); }}
            onDragLeave={() => setSobre((s) => (s === col.id ? null : s))}
            onDrop={(e) => soltar(col.id, e)}
            className={`w-64 shrink-0 rounded-lg bg-white border border-black/10 border-t-4 ${col.cor}
              ${sobre === col.id ? "ring-2 ring-brand/50" : ""}`}>
            <div className="px-3 py-2 border-b border-black/5 flex items-center justify-between">
              <h3 className="text-xs font-display font-semibold uppercase tracking-wide">{col.titulo}</h3>
              <span className="chip bg-black/5 text-steel">{itens.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[120px]">
              {itens.map((c) => (
                <div key={c.id} draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  className="rounded-md border border-black/10 bg-concrete/50 p-2.5 cursor-grab active:cursor-grabbing hover:border-brand/40">
                  {c.obra_nome && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">{c.obra_nome}</p>
                  )}
                  <p className="text-sm font-medium leading-snug">{c.servico}</p>
                  <p className="text-[11px] text-steel mt-0.5">{c.macroetapa}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {c.desvio > 0 && (
                      <span className="chip bg-dangersoft text-danger">+{c.desvio}d</span>
                    )}
                    {c.medicao_link && (
                      <a href={c.medicao_link} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-info hover:underline">medição ↗</a>
                    )}
                  </div>
                </div>
              ))}
              {itens.length === 0 && (
                <p className="text-[11px] text-steel/60 text-center py-4">Arraste cards para cá</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
