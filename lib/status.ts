// ============================================================
// Lógica automática de Status de Execução (regra do sistema)
// ============================================================
export type StatusExec =
  | "a_iniciar"
  | "atrasado"              // início previsto passou e não começou
  | "em_andamento"
  | "em_andamento_atrasado" // começou e estourou o fim previsto
  | "concluido";

export interface EtapaLike {
  inicio_previsto: string | null;
  fim_previsto: string | null;
  inicio_real: string | null;
  fim_real: string | null;
  medicao_status: "sem_medicao" | "medida_pendente" | "medida_paga";
}

export function hojeISO(): string {
  // Data local de São Paulo em YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function statusExecucao(e: EtapaLike, hoje = hojeISO()): StatusExec {
  if (e.inicio_real && e.fim_real) return "concluido";
  if (e.inicio_real) {
    if (e.fim_previsto && e.fim_previsto < hoje) return "em_andamento_atrasado";
    return "em_andamento";
  }
  if (e.inicio_previsto && e.inicio_previsto < hoje) return "atrasado";
  return "a_iniciar";
}

export function desvioDias(e: EtapaLike, hoje = hojeISO()): number {
  // Positivo = dias de atraso em relação ao previsto
  const diff = (a: string, b: string) =>
    Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
  const s = statusExecucao(e, hoje);
  if (s === "concluido" && e.fim_previsto && e.fim_real) return diff(e.fim_real, e.fim_previsto);
  if (s === "em_andamento_atrasado" && e.fim_previsto) return diff(hoje, e.fim_previsto);
  if (s === "atrasado" && e.inicio_previsto) return diff(hoje, e.inicio_previsto);
  return 0;
}

export const STATUS_LABEL: Record<StatusExec, string> = {
  a_iniciar: "A Iniciar",
  atrasado: "Atrasado",
  em_andamento: "Em Andamento",
  em_andamento_atrasado: "Em Andamento (Atrasado)",
  concluido: "Concluído"
};

export const MEDICAO_LABEL: Record<EtapaLike["medicao_status"], string> = {
  sem_medicao: "Sem Medição",
  medida_pendente: "Medida / Pendente",
  medida_paga: "Medida e Paga"
};

// ============================================================
// Métricas do dashboard
// ============================================================
export function metricas(etapas: (EtapaLike & { custo_previsto: number; custo_real: number; medicao_valor: number })[]) {
  const total = etapas.length;
  const concluidas = etapas.filter((e) => statusExecucao(e) === "concluido");
  const pagas = concluidas.filter((e) => e.medicao_status === "medida_paga");
  const progressoFisico = total ? (concluidas.length / total) * 100 : 0;
  const liberacaoFinanceira = concluidas.length ? (pagas.length / concluidas.length) * 100 : 0;
  const custoPrevisto = etapas.reduce((s, e) => s + Number(e.custo_previsto || 0), 0);
  const custoReal = etapas.reduce((s, e) => s + Number(e.custo_real || 0), 0);
  const valorMedidoPago = etapas
    .filter((e) => e.medicao_status === "medida_paga")
    .reduce((s, e) => s + Number(e.medicao_valor || 0), 0);
  const valorMedidoTotal = etapas
    .filter((e) => e.medicao_status !== "sem_medicao")
    .reduce((s, e) => s + Number(e.medicao_valor || 0), 0);
  return {
    total,
    concluidas: concluidas.length,
    progressoFisico,
    liberacaoFinanceira,
    desvioFinanceiro: custoReal - custoPrevisto,
    custoPrevisto,
    custoReal,
    valorMedidoPago,
    valorMedidoTotal,
    // aviso mandatório: concluído físico sem medição
    concluidasSemMedicao: concluidas.filter((e) => e.medicao_status === "sem_medicao").length
  };
}
