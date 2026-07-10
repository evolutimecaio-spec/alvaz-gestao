export default function MetricCard({
  titulo, valor, sub, tom = "neutro"
}: { titulo: string; valor: string; sub?: string; tom?: "neutro" | "ok" | "warn" | "danger" }) {
  const cor = { neutro: "text-ink", ok: "text-ok", warn: "text-warn", danger: "text-danger" }[tom];
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">{titulo}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
      {sub && <p className="text-xs text-steel mt-1">{sub}</p>}
    </div>
  );
}
