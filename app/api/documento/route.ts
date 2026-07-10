import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { urlAssinada } from "@/lib/storage";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/documento?id=<uuid>  → redireciona para URL assinada temporária.
// Exige sessão válida (não expõe arquivos privados publicamente).
export async function GET(req: NextRequest) {
  const sessao = await getSession();
  if (!sessao) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id ausente" }, { status: 400 });

  const { data: doc } = await db
    .from("documentos").select("storage_path").eq("id", id).single();
  if (!doc) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  const url = await urlAssinada(doc.storage_path);
  if (!url) return NextResponse.json({ erro: "falha ao gerar link" }, { status: 500 });
  return NextResponse.redirect(url);
}
