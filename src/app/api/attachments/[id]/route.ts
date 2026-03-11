import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isAdmin = session.user.role === "admin";
  const isUploader = attachment.uploadedBy === session.user.id;
  if (!isAdmin && !isUploader)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  // Supprimer le fichier physique
  try {
    const filePath = join(process.cwd(), "public", attachment.fileUrl);
    await unlink(filePath);
  } catch {
    // Fichier déjà supprimé ou introuvable — on continue
  }

  await prisma.attachment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
