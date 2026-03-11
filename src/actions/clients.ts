"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const clientSchema = z.object({
  companyName: z.string().min(1, "Nom requis"),
  address: z.string().optional(),
  sector: z.string().optional(),
  startDate: z.string().optional(),
  csmId: z.string().optional(),
  status: z.enum(["prospect", "actif", "inactif"]).optional(),
  notes: z.string().optional(),
});

const contactSchema = z.object({
  fullName: z.string().min(1, "Nom requis"),
  jobTitle: z.string().optional(),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;

// ─── Clients ────────────────────────────────────────────────────────────────

export async function createClient(data: ClientFormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  const client = await prisma.client.create({
    data: {
      companyName: parsed.data.companyName,
      address: parsed.data.address,
      sector: parsed.data.sector,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      csmId: parsed.data.csmId || session.user.id,
      status: parsed.data.status ?? "prospect",
      notes: parsed.data.notes,
    },
  });

  await prisma.activityLog.create({
    data: {
      eventType: "creation",
      description: `Client "${client.companyName}" créé`,
      userId: session.user.id,
      clientId: client.id,
    },
  });

  revalidatePath("/clients");
  return { success: true, id: client.id };
}

export async function updateClient(id: string, data: ClientFormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return { error: "Client introuvable" };

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && existing.csmId !== session.user.id)
    return { error: "Non autorisé" };

  await prisma.client.update({
    where: { id },
    data: {
      companyName: parsed.data.companyName,
      address: parsed.data.address,
      sector: parsed.data.sector,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      csmId: isAdmin ? (parsed.data.csmId || existing.csmId) : existing.csmId,
      status: parsed.data.status ?? existing.status,
      notes: parsed.data.notes,
    },
  });

  await prisma.activityLog.create({
    data: {
      eventType: "modification",
      description: `Client "${parsed.data.companyName}" modifié`,
      userId: session.user.id,
      clientId: id,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: true };
}

export async function archiveClient(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return { error: "Admin requis" };

  const client = await prisma.client.update({
    where: { id },
    data: { status: "inactif" },
  });

  await prisma.activityLog.create({
    data: {
      eventType: "changement_statut",
      description: `Client "${client.companyName}" archivé`,
      userId: session.user.id,
      clientId: id,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: true };
}

export async function deleteClient(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return { error: "Admin requis" };

  const existing = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      _count: {
        select: {
          projects: true,
          actions: true,
        },
      },
    },
  });

  if (!existing) return { error: "Client introuvable" };

  if (existing._count.projects > 0 || existing._count.actions > 0) {
    return {
      error:
        "Suppression impossible : ce client possède encore des projets ou des actions.",
    };
  }

  await prisma.client.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      eventType: "modification",
      description: `Client "${existing.companyName}" supprimé`,
      userId: session.user.id,
    },
  });

  revalidatePath("/clients");
  return { success: true };
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function createContact(clientId: string, data: ContactFormData) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  // Si isPrimary, retirer l'ancien contact principal
  if (parsed.data.isPrimary) {
    await prisma.contact.updateMany({
      where: { clientId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  await prisma.contact.create({
    data: {
      clientId,
      fullName: parsed.data.fullName,
      jobTitle: parsed.data.jobTitle,
      email: parsed.data.email,
      phone: parsed.data.phone,
      isPrimary: parsed.data.isPrimary ?? false,
      notes: parsed.data.notes,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function updateContact(
  clientId: string,
  contactId: string,
  data: ContactFormData
) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return { error: "Données invalides" };

  if (parsed.data.isPrimary) {
    await prisma.contact.updateMany({
      where: { clientId, isPrimary: true, NOT: { id: contactId } },
      data: { isPrimary: false },
    });
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      fullName: parsed.data.fullName,
      jobTitle: parsed.data.jobTitle,
      email: parsed.data.email,
      phone: parsed.data.phone,
      isPrimary: parsed.data.isPrimary ?? false,
      notes: parsed.data.notes,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function deleteContact(clientId: string, contactId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };

  await prisma.contact.delete({ where: { id: contactId } });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
