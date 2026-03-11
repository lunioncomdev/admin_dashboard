import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const isAdmin = session.user.role === "admin";
  const isSelf = session.user.id === id;

  // Un utilisateur normal ne peut modifier que lui-même
  if (!isAdmin && !isSelf)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const updates: Record<string, unknown> = {};

  // Changement de mot de passe (n'importe qui pour soi, admin pour tous)
  if (body.password) {
    if (!isSelf && !isAdmin)
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    updates.passwordHash = await bcrypt.hash(body.password, 10);
  }

  // Seul l'admin peut modifier rôle/isActive
  if (isAdmin) {
    if (body.role !== undefined) updates.role = body.role;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.fullName !== undefined) updates.fullName = body.fullName;
  } else if (isSelf) {
    // Un user peut modifier son propre nom
    if (body.fullName !== undefined) updates.fullName = body.fullName;
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: updates,
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id)
    return NextResponse.json({ error: "Impossible de se supprimer soi-même" }, { status: 400 });

  // Désactiver plutôt que supprimer pour préserver l'historique
  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
