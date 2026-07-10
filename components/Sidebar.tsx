import Link from "next/link";
import { logoutAction } from "@/app/actions";

const links = [
  { href: "/", rotulo: "Painel Hoje" },
  { href: "/obras", rotulo: "Obras" },
  { href: "/kanban", rotulo: "Kanban Portfólio" },
  { href: "/clientes", rotulo: "Clientes" }
];

export default function Sidebar({ nome }: { nome: string }) {
  return (
    <aside className="w-56 shrink-0 bg-graphite text-white min-h-screen flex flex-col">
      <div className="p-5">
        <div className="hazard h-1.5 rounded mb-3" />
        <p className="font-display font-bold text-lg leading-none">
          Alvaz <span className="text-brand">·</span> Gestão
        </p>
        <p className="text-[11px] text-white/50 mt-1">Gestão de Obras</p>
      </div>
      <nav className="px-3 space-y-0.5">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className="block rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
            {l.rotulo}
          </Link>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t border-white/10">
        <p className="text-xs text-white/60 mb-2">{nome}</p>
        <form action={logoutAction}>
          <button className="text-xs text-white/50 hover:text-white underline">Sair</button>
        </form>
      </div>
    </aside>
  );
}
