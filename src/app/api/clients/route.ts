import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  companyName: z.string().min(1),
  address: z.string().optional(),
  sector: z.string().optional(),
  startDate: z.string().optional(),
  csmId: z.string().optional(),
  status: z.enum(["prospect", "actif", "inactif"]).optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") as "prospect" | "actif" | "inactif" | null;
  const csmId = searchParams.get("csm_id");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const isAdmin = session.user.role === "admin";

  const where = {
    ...(status ? { status } : {}),
    ...(csmId ? { csmId } : !isAdmin ? { csmId: session.user.id } : {}),
    ...(search ? { companyName: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { csm: { select: { fullName: true } }, contacts: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json({ data: clients, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const client = await prisma.client.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      csmId: parsed.data.csmId ?? session.user.id,
      status: parsed.data.status ?? "prospect",
    },
  });

  await prisma.activityLog.create({
    data: { eventType: "creation", description: `Client "${client.companyName}" créé`, userId: session.user.id, clientId: client.id },
  });

  return NextResponse.json(client, { status: 201 });
}
