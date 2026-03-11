import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();

  if (!body.currentPassword || !body.newPassword)
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  if (body.newPassword.length < 8)
    return NextResponse.json({ error: "Mot de passe trop court (min 8 caractères)" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });

  const newHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true });
}
