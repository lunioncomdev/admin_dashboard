import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: actionId } = await params;

  const comments = await prisma.comment.findMany({
    where: { actionId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: actionId } = await params;
  const body = await req.json();

  if (!body.content?.trim())
    return NextResponse.json({ error: "Commentaire vide" }, { status: 400 });

  const comment = await prisma.comment.create({
    data: {
      actionId,
      authorId: session.user.id,
      content: body.content.trim(),
    },
    include: { author: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
