"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Building2, FolderOpen, CheckSquare, AlertTriangle,
  TrendingUp, Download, Users,
} from "lucide-react";

interface GlobalStats {
  totalClients: number;
  activeClients: number;
  totalProjects: number;
  activeProjects: number;
  totalActions: number;
  overdueActions: number;
  completedThisMonth: number;
}

type ClientStat = {
  id: string;
  companyName: string;
  status: string;
  csm: { fullName: string } | null;
  _count: { projects: number; actions: number };
};

type CsmStat = {
  id: string;
  fullName: string;
  _count: { clients: number; ownedProjects: number; assignedActions: number };
};

interface ReportsClientProps {
  global: GlobalStats;
  clients: ClientStat[];
  csm: CsmStat[];
  isAdmin: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  prospect: { label: "Prospect", className: "bg-gray-100 text-gray-600" },
  actif:    { label: "Actif",    className: "bg-green-100 text-green-700" },
  inactif:  { label: "Inactif",  className: "bg-red-100 text-red-600" },
};

export function ReportsClient({ global: g, clients, csm, isAdmin }: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<"global" | "clients" | "csm">("global");

  function exportCSV() {
    window.location.href = "/api/reports?format=csv";
  }

  const kpis = [
    {
      label: "Clients actifs",
      value: g.activeClients,
      sub: `sur ${g.totalClients} total`,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Projets en cours",
      value: g.activeProjects,
      sub: `sur ${g.totalProjects} total`,
      icon: FolderOpen,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Actions ouvertes",
      value: g.totalActions,
      sub: `${g.overdueActions} en retard`,
      icon: CheckSquare,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Terminées ce mois",
      value: g.completedThisMonth,
      sub: "actions complétées",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Rapports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue d'ensemble et statistiques</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1.5" />
          Exporter CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{kpi.label}</p>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerte retards */}
      {g.overdueActions > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{g.overdueActions} action{g.overdueActions > 1 ? "s" : ""}</span>{" "}
            en retard sur l'ensemble des clients.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "global", label: "Vue globale" },
          { key: "clients", label: "Par client" },
          ...(isAdmin ? [{ key: "csm", label: "Par CSM" }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet clients */}
      {activeTab === "clients" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">CSM</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Projets</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => {
                const sCfg = statusConfig[client.status] ?? statusConfig.actif;
                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{client.companyName}</td>
                    <td className="px-4 py-3.5 text-gray-500">{client.csm?.fullName ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sCfg.className}`}>
                        {sCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-600">{client._count.projects}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{client._count.actions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Contenu onglet CSM (admin) */}
      {activeTab === "csm" && isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">CSM</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Clients</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Projets</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Actions assignées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {csm.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-gray-600">{u._count.clients}</td>
                  <td className="px-4 py-3.5 text-right text-gray-600">{u._count.ownedProjects}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600">{u._count.assignedActions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vue globale */}
      {activeTab === "global" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Répartition clients par statut */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Clients par statut</h3>
            <div className="space-y-3">
              {(["actif", "prospect", "inactif"] as const).map((status) => {
                const count = clients.filter((c) => c.status === status).length;
                const pct = g.totalClients > 0 ? Math.round((count / g.totalClients) * 100) : 0;
                const cfg = statusConfig[status];
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{cfg.label}</span>
                      <span className="font-medium text-gray-900">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          status === "actif" ? "bg-green-500" :
                          status === "prospect" ? "bg-gray-400" : "bg-red-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Résumé actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance actions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Actions ouvertes</span>
                <span className="text-sm font-semibold text-gray-900">{g.totalActions}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Actions en retard</span>
                <span className={`text-sm font-semibold ${g.overdueActions > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {g.overdueActions}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Terminées ce mois</span>
                <span className="text-sm font-semibold text-green-600">{g.completedThisMonth}</span>
              </div>
              {g.totalActions > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Taux de retard</span>
                    <span>{Math.round((g.overdueActions / g.totalActions) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full"
                      style={{ width: `${Math.round((g.overdueActions / g.totalActions) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
