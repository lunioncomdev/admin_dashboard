import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      csm: { select: { id: true, fullName: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      projects: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!client) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && existing.csmId !== session.user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await req.json();
  const client = await prisma.client.update({
    where: { id },
    data: {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      csmId: isAdmin ? (body.csmId || existing.csmId) : existing.csmId,
    },
  });

  await prisma.activityLog.create({
    data: { eventType: "modification", description: `Client "${client.companyName}" modifié`, userId: session.user.id, clientId: id },
  });

  return NextResponse.json(client);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      _count: { select: { projects: true, actions: true } },
    },
  });

  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (existing._count.projects > 0 || existing._count.actions > 0) {
    return NextResponse.json(
      { error: "Suppression impossible : ce client possède encore des projets ou des actions." },
      { status: 400 }
    );
  }

  await prisma.client.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
