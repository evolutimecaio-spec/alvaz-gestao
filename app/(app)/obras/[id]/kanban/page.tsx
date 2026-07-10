import { db } from "@/lib/db";
import { paraCard } from "@/lib/kanban";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function KanbanObra({ params }: { params: { id: string } }) {
  const { data: etapas } = await db
    .from("etapas").select("*").eq("obra_id", params.id).order("ordem");
  const cards = (etapas ?? []).map((e) => paraCard(e));
  return (
    <div className="space-y-3">
      <p className="text-sm text-steel">
        Arraste os cards entre colunas — as datas reais e o status da medição são atualizados
        automaticamente. Link e valor da medição são editados no Cronograma.
      </p>
      <KanbanBoard cards={cards} />
    </div>
  );
}
