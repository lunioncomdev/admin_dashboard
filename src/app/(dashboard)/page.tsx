import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type SessionUser } from "@/types";
import Link from "next/link";
import {
  Building2,
  FolderOpen,
  CheckSquare,
  AlertTriangle,
  FileText,
} from "lucide-react";

async function getDashboardStats(user: SessionUser) {
  const isAdmin = user.role === "admin";

  const [totalClients, totalProjects, myActions, overdueActions] =
    await Promise.all([
      prisma.client.count({
        where: isAdmin ? {} : { csmId: user.id },
      }),
      prisma.project.count({
        where: isAdmin ? {} : { ownerId: user.id },
      }),
      prisma.action.count({
        where: { assignedTo: user.id, status: { in: ["a_faire", "en_cours"] } },
      }),
      prisma.action.count({
        where: {
          assignedTo: isAdmin ? undefined : user.id,
          status: { in: ["a_faire", "en_cours"] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

  return { totalClients, totalProjects, myActions, overdueActions };
}

async function getRecentActions(userId: string, isAdmin: boolean) {
  return prisma.action.findMany({
    where: isAdmin ? {} : { assignedTo: userId },
    take: 5,
    orderBy: { dueDate: "asc" },
    include: {
      client: { select: { companyName: true } },
      assignee: { select: { fullName: true } },
    },
  });
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user as SessionUser;
  const isAdmin = user.role === "admin";

  const [stats, recentActions] = await Promise.all([
    getDashboardStats(user),
    getRecentActions(user.id, isAdmin),
  ]);

  const kpis = [
    {
      label: isAdmin ? "Clients totaux" : "Mes clients",
      value: stats.totalClients,
      icon: Building2,
      color: "blue",
    },
    {
      label: isAdmin ? "Projets actifs" : "Mes projets",
      value: stats.totalProjects,
      icon: FolderOpen,
      color: "indigo",
    },
    {
      label: "Mes actions",
      value: stats.myActions,
      icon: CheckSquare,
      color: "green",
    },
    {
      label: "Actions en retard",
      value: stats.overdueActions,
      icon: AlertTriangle,
      color: stats.overdueActions > 0 ? "red" : "gray",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    gray: "bg-gray-100 text-gray-500",
  };

  const statusLabels: Record<string, string> = {
    a_faire: "À faire",
    en_cours: "En cours",
    termine: "Terminé",
    bloque: "Bloqué",
  };

  const priorityColors: Record<string, string> = {
    basse: "bg-blue-100 text-blue-700",
    moyenne: "bg-yellow-100 text-yellow-700",
    haute: "bg-orange-100 text-orange-700",
    urgente: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Bonjour, {user.name}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Voici un résumé de votre activité
        </p>
      </div>

      {/* Actions rapides (Brief passation pour admins) */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
          <Link
            href="/clients/intake"
            className="inline-flex items-center gap-3 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
          >
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <span>Remplir un brief de passation client</span>
            <span className="text-xs text-blue-500 ml-auto">→</span>
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${colorMap[kpi.color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Actions récentes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Prochaines actions
          </h2>
        </div>
        {recentActions.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">Aucune action en cours</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentActions.map((action) => {
              const isOverdue =
                new Date(action.dueDate) < new Date() &&
                action.status !== "termine";

              return (
                <div
                  key={action.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {action.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {action.client.companyName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[action.priority]}`}
                    >
                      {action.priority}
                    </span>
                    <span
                      className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}
                    >
                      {new Date(action.dueDate).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
