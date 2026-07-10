import { db } from "@/lib/db";
import { criarCliente } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Clientes() {
  const { data: clientes } = await db.from("clientes").select("*").order("nome");
  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="font-display text-2xl font-bold">Clientes</h1>
      <form action={criarCliente} className="card p-4 grid md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label">Nome *</label>
          <input name="nome" required className="input" />
        </div>
        <div>
          <label className="label">Contato</label>
          <input name="contato" className="input" placeholder="(11) 9…" />
        </div>
        <div>
          <label className="label">CPF/CNPJ</label>
          <input name="cpf_cnpj" className="input" />
        </div>
        <button className="btn">Adicionar</button>
      </form>
      <div className="card overflow-hidden">
        <table className="grid-table">
          <thead><tr><th>Nome</th><th>Contato</th><th>E-mail</th><th>CPF/CNPJ</th></tr></thead>
          <tbody>
            {(clientes ?? []).map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.nome}</td>
                <td>{c.contato ?? "—"}</td>
                <td>{c.email ?? "—"}</td>
                <td>{c.cpf_cnpj ?? "—"}</td>
              </tr>
            ))}
            {(clientes ?? []).length === 0 && (
              <tr><td colSpan={4} className="text-steel">Nenhum cliente cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
