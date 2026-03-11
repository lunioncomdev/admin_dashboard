import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const clientId = formData.get("clientId") as string | null;
  const projectId = formData.get("projectId") as string | null;
  const actionId = formData.get("actionId") as string | null;

  if (!file) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });

  // Créer un nom unique pour éviter les collisions
  const ext = file.name.split(".").pop() ?? "bin";
  const uniqueName = `${randomUUID()}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(join(uploadDir, uniqueName), Buffer.from(bytes));

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.name,
      fileUrl: `/uploads/${uniqueName}`,
      fileSize: file.size,
      mimeType: file.type,
      clientId: clientId || null,
      projectId: projectId || null,
      actionId: actionId || null,
      uploadedBy: session.user.id,
    },
    include: {
      uploader: { select: { fullName: true } },
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");
  const projectId = searchParams.get("project_id");
  const actionId = searchParams.get("action_id");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (projectId) where.projectId = projectId;
  if (actionId) where.actionId = actionId;

  const attachments = await prisma.attachment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      uploader: { select: { fullName: true } },
    },
  });

  return NextResponse.json(attachments);
}
