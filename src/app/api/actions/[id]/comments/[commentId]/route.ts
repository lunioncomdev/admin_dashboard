import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { commentId } = await params;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isAdmin = session.user.role === "admin";
  const isAuthor = comment.authorId === session.user.id;
  if (!isAdmin && !isAuthor)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  await prisma.comment.delete({ where: { id: commentId } });

  return NextResponse.json({ success: true });
}
