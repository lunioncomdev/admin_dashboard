import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("client_id");
  const ownerId = searchParams.get("owner_id");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (ownerId) where.ownerId = ownerId;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, companyName: true } },
        owner: { select: { id: true, fullName: true } },
        _count: { select: { actions: true, milestones: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({ projects, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();

  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
      clientId: body.clientId,
      ownerId: body.ownerId ?? session.user.id,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      status: body.status ?? "nouveau",
      budget: body.budget ? parseFloat(body.budget) : undefined,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
