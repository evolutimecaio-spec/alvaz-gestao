import { db } from "./db";

export const BUCKET = "documentos";

// Gera uma URL assinada temporária (60 min) para baixar/ver um arquivo privado.
export async function urlAssinada(path: string): Promise<string | null> {
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
