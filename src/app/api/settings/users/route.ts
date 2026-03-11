import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: { assignedActions: true, ownedProjects: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const body = await req.json();

  if (!body.email || !body.fullName || !body.password)
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing)
    return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

  const passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: body.fullName,
      email: body.email,
      passwordHash,
      role: body.role ?? "user",
      isActive: true,
    },
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json(user, { status: 201 });
}
