import { db } from "@/lib/db";
import { paraCard } from "@/lib/kanban";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function KanbanPortfolio() {
  const { data: obras } = await db.from("obras").select("id, nome").eq("status", "ativa");
  const nomes = new Map((obras ?? []).map((o) => [o.id, o.nome]));
  const ids = [...nomes.keys()];
  const { data: etapas } = ids.length
    ? await db.from("etapas").select("*").in("obra_id", ids).order("ordem")
    : { data: [] as never[] };
  const cards = (etapas ?? []).map((e) => paraCard(e, nomes.get(e.obra_id)));
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold">Kanban do Portfólio</h1>
        <p className="text-sm text-steel">Todas as etapas de todas as obras ativas em um só quadro.</p>
      </header>
      <KanbanBoard cards={cards} />
    </div>
  );
}
