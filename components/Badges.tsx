import { STATUS_LABEL, MEDICAO_LABEL, type StatusExec, type EtapaLike } from "@/lib/status";

const EXEC_STYLE: Record<StatusExec, string> = {
  a_iniciar: "bg-black/5 text-steel",
  atrasado: "bg-dangersoft text-danger",
  em_andamento: "bg-infosoft text-info",
  em_andamento_atrasado: "bg-warnsoft text-warn",
  concluido: "bg-oksoft text-ok"
};

export function ExecBadge({ status, desvio = 0 }: { status: StatusExec; desvio?: number }) {
  return (
    <span className={`chip ${EXEC_STYLE[status]}`}>
      {STATUS_LABEL[status]}
      {desvio > 0 && status !== "concluido" ? ` · +${desvio}d` : ""}
      {status === "concluido" && desvio > 0 ? ` · +${desvio}d` : ""}
      {status === "concluido" && desvio < 0 ? ` · ${desvio}d` : ""}
    </span>
  );
}

const MED_STYLE: Record<EtapaLike["medicao_status"], string> = {
  sem_medicao: "bg-black/5 text-steel",
  medida_pendente: "bg-warnsoft text-warn",
  medida_paga: "bg-oksoft text-ok"
};

export function MedicaoBadge({ status }: { status: EtapaLike["medicao_status"] }) {
  return <span className={`chip ${MED_STYLE[status]}`}>{MEDICAO_LABEL[status]}</span>;
}

export function AvisoMedicao() {
  return (
    <span className="text-[11px] text-warn italic">
      [Aviso: Serviço concluído físico, pendente de medição]
    </span>
  );
}
