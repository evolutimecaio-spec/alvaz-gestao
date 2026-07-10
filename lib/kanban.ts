import { statusExecucao, desvioDias, hojeISO, type EtapaLike } from "./status";

export function colunaKanban(e: EtapaLike, hoje = hojeISO()): string {
  const st = statusExecucao(e, hoje);
  if (st === "concluido") {
    if (e.medicao_status === "medida_paga") return "medida_paga";
    if (e.medicao_status === "medida_pendente") return "medida_pendente";
    return "concluido_sem_medicao";
  }
  if (st === "em_andamento_atrasado") return "em_andamento_atrasado";
  if (st === "em_andamento") return "em_andamento";
  return "a_iniciar"; // inclui "atrasado" — o desvio aparece no card
}

export function paraCard(e: EtapaLike & { id: string; obra_id: string; macroetapa: string; servico: string; medicao_link: string | null }, obraNome?: string) {
  return {
    id: e.id,
    obra_id: e.obra_id,
    obra_nome: obraNome,
    macroetapa: e.macroetapa,
    servico: e.servico,
    coluna: colunaKanban(e),
    desvio: desvioDias(e),
    medicao_link: e.medicao_link
  };
}
