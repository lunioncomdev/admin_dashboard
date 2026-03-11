"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const actionSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Client requis"),
  projectId: z.string().min(1, "Projet requis"),
  assignedTo: z.string().min(1, "Assigné requis"),
  priority: z.enum(["basse", "moyenne", "haute", "urgente"]).default("moyenne"),
  status: z.enum(["a_faire", "en_cours", "termine", "bloque"]).default("a_faire"),
  dueDate: z.string().min(1, "Date requise"),
});

export type ActionFormData = z.infer<typeof actionSchema>;

export async function createAction(data: ActionFormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = actionSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  const action = await prisma.action.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
      assignedTo: parsed.data.assignedTo,
      priority: parsed.data.priority,
      status: parsed.data.status,
      dueDate: new Date(parsed.data.dueDate),
      createdBy: session.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      eventType: "creation",
      description: `Action "${action.title}" créée`,
      userId: session.user.id,
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
      actionId: action.id,
    },
  });

  revalidatePath("/actions");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { success: true, id: action.id };
}

export async function updateAction(id: string, data: ActionFormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = actionSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  const existing = await prisma.action.findUnique({ where: { id } });
  if (!existing) return { error: "Action introuvable" };

  const isAdmin = session.user.role === "admin";
  const isAssignee = existing.assignedTo === session.user.id;
  const isCreator = existing.createdBy === session.user.id;
  if (!isAdmin && !isAssignee && !isCreator) return { error: "Non autorisé" };

  const completedAt =
    parsed.data.status === "termine" && existing.status !== "termine"
      ? new Date()
      : parsed.data.status !== "termine"
      ? null
      : existing.completedAt;

  await prisma.action.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
      assignedTo: parsed.data.assignedTo,
      priority: parsed.data.priority,
      status: parsed.data.status,
      dueDate: new Date(parsed.data.dueDate),
      completedAt,
    },
  });

  if (parsed.data.status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        eventType: "changement_statut",
        description: `Action "${existing.title}" : statut → ${parsed.data.status}`,
        userId: session.user.id,
        clientId: existing.clientId,
        projectId: existing.projectId,
        actionId: id,
      },
    });
  }

  revalidatePath("/actions");
  revalidatePath(`/clients/${existing.clientId}`);
  revalidatePath(`/projects/${existing.projectId}`);
  return { success: true };
}

export async function updateActionStatus(id: string, status: "a_faire" | "en_cours" | "termine" | "bloque") {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const existing = await prisma.action.findUnique({ where: { id } });
  if (!existing) return { error: "Action introuvable" };

  const isAdmin = session.user.role === "admin";
  const isAssignee = existing.assignedTo === session.user.id;
  const isCreator = existing.createdBy === session.user.id;
  if (!isAdmin && !isAssignee && !isCreator) return { error: "Non autorisé" };

  const completedAt =
    status === "termine" ? new Date() : null;

  await prisma.action.update({
    where: { id },
    data: { status, completedAt },
  });

  await prisma.activityLog.create({
    data: {
      eventType: "changement_statut",
      description: `Action "${existing.title}" : statut → ${status}`,
      userId: session.user.id,
      clientId: existing.clientId,
      projectId: existing.projectId,
      actionId: id,
    },
  });

  revalidatePath("/actions");
  revalidatePath(`/clients/${existing.clientId}`);
  revalidatePath(`/projects/${existing.projectId}`);
  return { success: true };
}

export async function deleteAction(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return { error: "Admin requis" };

  const existing = await prisma.action.findUnique({ where: { id } });
  if (!existing) return { error: "Action introuvable" };

  await prisma.action.delete({ where: { id } });

  revalidatePath("/actions");
  revalidatePath(`/clients/${existing.clientId}`);
  revalidatePath(`/projects/${existing.projectId}`);
  return { success: true };
}

export async function createComment(actionId: string, content: string) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };
  if (!content.trim()) return { error: "Commentaire vide" };

  const action = await prisma.action.findUnique({ where: { id: actionId } });
  if (!action) return { error: "Action introuvable" };

  await prisma.comment.create({
    data: {
      actionId,
      authorId: session.user.id,
      content: content.trim(),
    },
  });

  await prisma.activityLog.create({
    data: {
      eventType: "commentaire",
      description: `Commentaire ajouté sur "${action.title}"`,
      userId: session.user.id,
      clientId: action.clientId,
      projectId: action.projectId,
      actionId,
    },
  });

  revalidatePath("/actions");
  return { success: true };
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { action: true },
  });
  if (!comment) return { error: "Commentaire introuvable" };

  const isAdmin = session.user.role === "admin";
  const isAuthor = comment.authorId === session.user.id;
  if (!isAdmin && !isAuthor) return { error: "Non autorisé" };

  await prisma.comment.delete({ where: { id: commentId } });

  revalidatePath("/actions");
  return { success: true };
}
