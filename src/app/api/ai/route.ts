import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runAiRequest, type AiRequest } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "REMPLACER_PAR_VOTRE_CLE_OPENAI") {
    return NextResponse.json({ error: "Clé OpenAI non configurée" }, { status: 503 });
  }

  const body = await req.json() as AiRequest;

  if (!body.type) {
    return NextResponse.json({ error: "Type de requête manquant" }, { status: 400 });
  }

  try {
    const result = await runAiRequest(body, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur IA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
