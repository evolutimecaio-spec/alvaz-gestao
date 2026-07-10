import { loginAction } from "@/app/actions";

export default function Login({ searchParams }: { searchParams: { erro?: string } }) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="hazard h-2 rounded-t-lg" />
        <div className="card rounded-t-none p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Alvaz <span className="text-brand">·</span> Gestão
          </h1>
          <p className="text-sm text-steel mt-1 mb-6">Gestão de Obras · Engenharia de Produção</p>
          {searchParams.erro && (
            <p className="mb-4 rounded-md bg-dangersoft text-danger text-sm px-3 py-2">
              Senha incorreta.
            </p>
          )}
          <form action={loginAction} className="space-y-4">
            <div>
              <label className="label">Senha de acesso</label>
              <input name="senha" type="password" required autoFocus className="input"
                autoComplete="current-password" />
            </div>
            <button className="btn-brand w-full justify-center">Entrar</button>
          </form>
        </div>
      </div>
    </main>
  );
}
