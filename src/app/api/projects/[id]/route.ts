import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, companyName: true } },
      owner: { select: { id: true, fullName: true } },
      milestones: { orderBy: { targetDate: "asc" } },
      actions: {
        where: { status: { not: "termine" } },
        orderBy: { dueDate: "asc" },
        take: 10,
        include: {
          assignee: { select: { fullName: true } },
        },
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { fullName: true } } },
      },
      _count: { select: { actions: true } },
    },
  });

  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      clientId: body.clientId,
      ownerId: body.ownerId,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      status: body.status,
      budget: body.budget ? parseFloat(body.budget) : null,
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const { id } = await params;
  await prisma.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
