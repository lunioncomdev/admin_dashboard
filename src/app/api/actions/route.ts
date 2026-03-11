import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const clientId = searchParams.get("client_id");
  const projectId = searchParams.get("project_id");
  const assignedTo = searchParams.get("assigned_to");
  const search = searchParams.get("search");
  const overdue = searchParams.get("overdue") === "true";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (clientId) where.clientId = clientId;
  if (projectId) where.projectId = projectId;
  if (assignedTo) where.assignedTo = assignedTo;
  if (search) where.title = { contains: search, mode: "insensitive" };
  if (overdue) where.dueDate = { lt: new Date() };

  const [actions, total] = await prisma.$transaction([
    prisma.action.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      include: {
        client: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
        creator: { select: { id: true, fullName: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.action.count({ where }),
  ]);

  return NextResponse.json({ actions, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();

  const action = await prisma.action.create({
    data: {
      title: body.title,
      description: body.description,
      clientId: body.clientId,
      projectId: body.projectId,
      assignedTo: body.assignedTo,
      priority: body.priority ?? "moyenne",
      status: body.status ?? "a_faire",
      dueDate: new Date(body.dueDate),
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(action, { status: 201 });
}
