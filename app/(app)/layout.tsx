import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSession();
  if (!sessao) redirect("/login");
  return (
    <div className="flex">
      <Sidebar nome={sessao.nome} />
      <main className="flex-1 p-6 max-w-[1400px]">{children}</main>
    </div>
  );
}
