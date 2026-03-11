import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: clientId, contactId } = await params;
  const body = await req.json();

  if (body.isPrimary) {
    await prisma.contact.updateMany({ where: { clientId, isPrimary: true, NOT: { id: contactId } }, data: { isPrimary: false } });
  }

  const contact = await prisma.contact.update({ where: { id: contactId }, data: body });
  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { contactId } = await params;
  await prisma.contact.delete({ where: { id: contactId } });
  return NextResponse.json({ success: true });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id: clientId, contactId } = await params;
  await prisma.contact.updateMany({ where: { clientId, isPrimary: true }, data: { isPrimary: false } });
  const contact = await prisma.contact.update({ where: { id: contactId }, data: { isPrimary: true } });
  return NextResponse.json(contact);
}
