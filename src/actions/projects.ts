"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Client requis"),
  ownerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["nouveau", "en_cours", "en_pause", "termine", "annule"]).default("nouveau"),
  budget: z.string().optional(),
});

const milestoneSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  targetDate: z.string().optional(),
  completed: z.boolean().optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;
export type MilestoneFormData = z.infer<typeof milestoneSchema>;

// ─── Projects ────────────────────────────────────────────────────────────────

export async function createProject(data: ProjectFormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = projectSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      clientId: parsed.data.clientId,
      ownerId: parsed.data.ownerId || session.user.id,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      status: parsed.data.status,
      budget: parsed.data.budget ? parseFloat(parsed.data.budget) : undefined,
    },
  });

  await prisma.activityLog.create({
    data: {
      eventType: "creation",
      description: `Projet "${project.name}" créé`,
      userId: session.user.id,
      clientId: parsed.data.clientId,
      projectId: project.id,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { success: true, id: project.id };
}

export async function updateProject(id: string, data: ProjectFormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = projectSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return { error: "Projet introuvable" };

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && existing.ownerId !== session.user.id)
    return { error: "Non autorisé" };

  await prisma.project.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      clientId: parsed.data.clientId,
      ownerId: isAdmin ? (parsed.data.ownerId || existing.ownerId) : existing.ownerId,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      status: parsed.data.status,
      budget: isAdmin && parsed.data.budget ? parseFloat(parsed.data.budget) : existing.budget,
    },
  });

  if (parsed.data.status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        eventType: "changement_statut",
        description: `Projet "${parsed.data.name}" : statut → ${parsed.data.status}`,
        userId: session.user.id,
        clientId: existing.clientId,
        projectId: id,
      },
    });
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/clients/${existing.clientId}`);
  return { success: true };
}

export async function deleteProject(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return { error: "Admin requis" };

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return { error: "Projet introuvable" };

  await prisma.project.delete({ where: { id } });

  revalidatePath("/projects");
  revalidatePath(`/clients/${existing.clientId}`);
  return { success: true };
}

// ─── Milestones ──────────────────────────────────────────────────────────────

export async function createMilestone(projectId: string, data: MilestoneFormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = milestoneSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  await prisma.milestone.create({
    data: {
      projectId,
      name: parsed.data.name,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined,
      completed: parsed.data.completed ?? false,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updateMilestone(
  milestoneId: string,
  data: Partial<MilestoneFormData>
) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return { error: "Jalon introuvable" };

  const completedAt =
    data.completed && !milestone.completed ? new Date() : data.completed === false ? null : milestone.completedAt;

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      name: data.name ?? milestone.name,
      targetDate: data.targetDate ? new Date(data.targetDate) : milestone.targetDate,
      completed: data.completed ?? milestone.completed,
      completedAt,
    },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  return { success: true };
}

export async function deleteMilestone(milestoneId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return { error: "Jalon introuvable" };

  await prisma.milestone.delete({ where: { id: milestoneId } });

  revalidatePath(`/projects/${milestone.projectId}`);
  return { success: true };
}
