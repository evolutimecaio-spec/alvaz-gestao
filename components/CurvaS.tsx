"use client";

// Curva S: acumulado previsto x realizado por mês (físico em % ou financeiro em %).
export default function CurvaS({
  pontos, vazio
}: {
  pontos: { mes: string; previsto: number; realizado: number }[];
  vazio?: string;
}) {
  if (pontos.length < 2)
    return <p className="text-sm text-steel">{vazio ?? "Preencha datas previstas no cronograma para gerar a Curva S."}</p>;

  const W = 640, H = 220, P = 36;
  const x = (i: number) => P + (i / (pontos.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / 100) * (H - 2 * P);
  const linha = (k: "previsto" | "realizado") =>
    pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[k])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Curva S da obra">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="#00000012" />
          <text x={P - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#5A6570">{v}%</text>
        </g>
      ))}
      <path d={linha("previsto")} fill="none" stroke="#5A6570" strokeWidth="2" strokeDasharray="5 4" />
      <path d={linha("realizado")} fill="none" stroke="#C2410C" strokeWidth="2.5" />
      {pontos.map((p, i) => (
        <text key={p.mes} x={x(i)} y={H - P + 14} textAnchor="middle" fontSize="9" fill="#5A6570">
          {p.mes}
        </text>
      ))}
      <g fontSize="10">
        <line x1={W - 200} x2={W - 176} y1={16} y2={16} stroke="#5A6570" strokeWidth="2" strokeDasharray="5 4" />
        <text x={W - 170} y={19} fill="#5A6570">Previsto</text>
        <line x1={W - 110} x2={W - 86} y1={16} y2={16} stroke="#C2410C" strokeWidth="2.5" />
        <text x={W - 80} y={19} fill="#C2410C">Realizado</text>
      </g>
    </svg>
  );
}
