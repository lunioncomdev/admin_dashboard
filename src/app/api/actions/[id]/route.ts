import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  const action = await prisma.action.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, companyName: true } },
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, fullName: true } },
      creator: { select: { id: true, fullName: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (!action) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(action);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.action.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const completedAt =
    body.status === "termine" && existing.status !== "termine"
      ? new Date()
      : body.status !== "termine"
      ? null
      : existing.completedAt;

  const action = await prisma.action.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      clientId: body.clientId,
      projectId: body.projectId,
      assignedTo: body.assignedTo,
      priority: body.priority,
      status: body.status,
      dueDate: new Date(body.dueDate),
      completedAt,
    },
  });

  return NextResponse.json(action);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.action.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const completedAt = body.status === "termine" ? new Date() : null;

  const action = await prisma.action.update({
    where: { id },
    data: { status: body.status, completedAt },
  });

  return NextResponse.json(action);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { id } = await params;
  await prisma.action.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
