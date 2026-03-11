import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsClient } from "./_components/reports-client";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "admin";
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalClients,
    activeClients,
    totalProjects,
    activeProjects,
    totalActions,
    overdueActions,
    completedThisMonth,
    clientStats,
    csmStats,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: "actif" } }),
    prisma.project.count(),
    prisma.project.count({ where: { status: "en_cours" } }),
    prisma.action.count({ where: { status: { not: "termine" } } }),
    prisma.action.count({
      where: { status: { not: "termine" }, dueDate: { lt: now } },
    }),
    prisma.action.count({
      where: { status: "termine", completedAt: { gte: startOfMonth } },
    }),
    prisma.client.findMany({
      select: {
        id: true,
        companyName: true,
        status: true,
        csm: { select: { fullName: true } },
        _count: { select: { projects: true, actions: true } },
      },
      orderBy: { companyName: "asc" },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { isActive: true },
          select: {
            id: true,
            fullName: true,
            _count: {
              select: { clients: true, ownedProjects: true, assignedActions: true },
            },
          },
          orderBy: { fullName: "asc" },
        })
      : [],
  ]);

  return (
    <ReportsClient
      global={{ totalClients, activeClients, totalProjects, activeProjects, totalActions, overdueActions, completedThisMonth }}
      clients={clientStats}
      csm={csmStats}
      isAdmin={isAdmin}
    />
  );
}
