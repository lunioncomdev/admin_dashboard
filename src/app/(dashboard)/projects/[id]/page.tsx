import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { ProjectDetailClient } from "../_components/project-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const now = new Date();

  const [project, clients, allProjects, users, actionStatusCounts, overdueActions] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        owner: { select: { id: true, fullName: true } },
        milestones: { orderBy: { targetDate: "asc" } },
        actions: {
          where: { status: { not: "termine" } },
          orderBy: { dueDate: "asc" },
          take: 10,
          include: {
            assignee: { select: { fullName: true } },
          },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { fullName: true } } },
        },
        _count: { select: { actions: true } },
      },
    }),
    prisma.client.findMany({
      where: { status: { not: "inactif" } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
    prisma.project.findMany({
      where: { status: { not: "annule" } },
      select: { id: true, name: true, clientId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.action.groupBy({
      by: ["status"],
      where: { projectId: id },
      _count: { _all: true },
    }),
    prisma.action.count({
      where: {
        projectId: id,
        status: { in: ["a_faire", "en_cours", "bloque"] },
        dueDate: { lt: now },
      },
    }),
  ]);

  if (!project) notFound();

  const actionCounts = {
    a_faire: 0,
    en_cours: 0,
    termine: 0,
    bloque: 0,
  };

  for (const row of actionStatusCounts) {
    actionCounts[row.status] = row._count._all;
  }

  const completedMilestones = project.milestones.filter((m) => m.completed).length;

  return (
    <ProjectDetailClient
      project={{
        ...project,
        budget: project.budget !== null ? Number(project.budget) : null,
      }}
      developmentTracking={{
        totalActions: project._count.actions,
        completedActions: actionCounts.termine,
        inProgressActions: actionCounts.en_cours,
        blockedActions: actionCounts.bloque,
        overdueActions,
        totalMilestones: project.milestones.length,
        completedMilestones,
      }}
      clients={clients}
      allProjects={allProjects}
      users={users}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
