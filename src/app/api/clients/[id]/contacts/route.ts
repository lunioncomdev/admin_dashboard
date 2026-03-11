import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const contacts = await prisma.contact.findMany({
    where: { clientId: id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: clientId } = await params;
  const body = await req.json();

  if (body.isPrimary) {
    await prisma.contact.updateMany({ where: { clientId, isPrimary: true }, data: { isPrimary: false } });
  }

  const contact = await prisma.contact.create({ data: { ...body, clientId } });
  return NextResponse.json(contact, { status: 201 });
}
