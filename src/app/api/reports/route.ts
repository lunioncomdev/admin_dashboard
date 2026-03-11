import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "global";
  const clientId = searchParams.get("client_id");
  const csmId = searchParams.get("csm_id");
  const format = searchParams.get("format"); // "csv"

  const isAdmin = session.user.role === "admin";

  // Statistiques globales
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
    // Stats par client
    prisma.client.findMany({
      where: clientId ? { id: clientId } : {},
      select: {
        id: true,
        companyName: true,
        status: true,
        csm: { select: { fullName: true } },
        _count: {
          select: {
            projects: true,
            actions: true,
          },
        },
      },
      orderBy: { companyName: "asc" },
      take: isAdmin ? 100 : 50,
    }),
    // Stats par CSM (admin seulement)
    isAdmin
      ? prisma.user.findMany({
          where: csmId ? { id: csmId } : { isActive: true },
          select: {
            id: true,
            fullName: true,
            _count: {
              select: {
                clients: true,
                ownedProjects: true,
                assignedActions: true,
              },
            },
          },
          orderBy: { fullName: "asc" },
        })
      : [],
  ]);

  const stats = {
    global: {
      totalClients,
      activeClients,
      totalProjects,
      activeProjects,
      totalActions,
      overdueActions,
      completedThisMonth,
    },
    clients: clientStats,
    csm: csmStats,
  };

  // Export CSV
  if (format === "csv") {
    const rows = [
      ["Entreprise", "Statut", "CSM", "Projets", "Actions"],
      ...clientStats.map((c) => [
        c.companyName,
        c.status,
        c.csm?.fullName ?? "",
        String(c._count.projects),
        String(c._count.actions),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rapport-clients-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json(stats);
}
