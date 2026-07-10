"use client";
export default function ImprimirBtn() {
  return (
    <button onClick={() => window.print()} className="btn-ghost print:hidden">
      Imprimir / Salvar PDF
    </button>
  );
}
