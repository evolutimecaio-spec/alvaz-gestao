import { NextRequest, NextResponse } from "next/server";

// Proteção leve na borda: sem cookie de sessão → manda pro login.
// A validação real da sessão continua no layout (server-side, contra o banco).
export function middleware(req: NextRequest) {
  const temSessao = req.cookies.has("cs_session");
  const { pathname } = req.nextUrl;

  const rotaPublica = pathname === "/login" || pathname.startsWith("/api/cron");

  if (!temSessao && !rotaPublica) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (temSessao && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
