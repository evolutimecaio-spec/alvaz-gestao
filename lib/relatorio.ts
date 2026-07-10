import { statusExecucao, hojeISO, type EtapaLike } from "./status";

export interface EtapaCompleta extends EtapaLike {
  id: string;
  macroetapa: string;
  servico: string;
  medicao_valor: number;
  medicao_link: string | null;
  fim_real: string | null;
}
export interface MidiaLink {
  titulo: string;
  url: string;
  tipo: string;
  etapa_id: string | null;
}

// Seleciona etapas concluídas no período (por fim_real) e monta o relatório.
export function montarRelatorio(
  obra: { nome: string; endereco: string | null; rt_nome: string | null; crea: string | null },
  cliente: string,
  etapas: EtapaCompleta[],
  midias: MidiaLink[],
  de: string,
  ate: string
) {
  const noPeriodo = etapas.filter(
    (e) =>
      statusExecucao(e) === "concluido" &&
      e.fim_real &&
      e.fim_real >= de &&
      e.fim_real <= ate
  );

  const porMacro: { macro: string; itens: EtapaCompleta[]; midias: MidiaLink[] }[] = [];
  noPeriodo.forEach((e) => {
    let g = porMacro.find((x) => x.macro === e.macroetapa);
    if (!g) {
      g = { macro: e.macroetapa, itens: [], midias: [] };
      porMacro.push(g);
    }
    g.itens.push(e);
  });
  // anexa mídias vinculadas às etapas do período
  const idsPeriodo = new Set(noPeriodo.map((e) => e.id));
  midias
    .filter((m) => m.etapa_id && idsPeriodo.has(m.etapa_id))
    .forEach((m) => {
      const etapa = noPeriodo.find((e) => e.id === m.etapa_id);
      const g = porMacro.find((x) => x.macro === etapa?.macroetapa);
      g?.midias.push(m);
    });

  const valorTotal = noPeriodo.reduce((s, e) => s + Number(e.medicao_valor || 0), 0);
  return {
    obra,
    cliente,
    de,
    ate,
    grupos: porMacro,
    totalEtapas: noPeriodo.length,
    valorTotal,
    geradoEm: hojeISO()
  };
}

export type Relatorio = ReturnType<typeof montarRelatorio>;
