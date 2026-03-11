"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectDialog } from "./project-dialog";
import { ActionDialog } from "../../actions/_components/action-dialog";
import { AttachmentsPanel } from "@/components/shared/attachments-panel";
import { AiPanel } from "@/components/shared/ai-panel";
import {
  createMilestone, updateMilestone, deleteMilestone,
} from "@/actions/projects";
import {
  Pencil, Plus, Trash2, CheckSquare, Clock, Calendar,
  Building2, User, FolderOpen, AlertTriangle, Check,
} from "lucide-react";

type ProjectData = {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  ownerId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  budget: number | null;
  client: { id: string; companyName: string };
  owner: { id: string; fullName: string } | null;
  milestones: {
    id: string; name: string; targetDate: Date | null; completed: boolean; completedAt: Date | null;
  }[];
  actions: {
    id: string; title: string; priority: string; status: string; dueDate: Date;
    assignee: { fullName: string };
  }[];
  activityLogs: {
    id: string; eventType: string; description: string; createdAt: Date;
    user: { fullName: string } | null;
  }[];
  _count: { actions: number };
};

const statusConfig: Record<string, { label: string; className: string }> = {
  nouveau:  { label: "Nouveau",  className: "bg-gray-100 text-gray-600" },
  en_cours: { label: "En cours", className: "bg-blue-100 text-blue-700" },
  en_pause: { label: "En pause", className: "bg-yellow-100 text-yellow-700" },
  termine:  { label: "Terminé",  className: "bg-green-100 text-green-700" },
  annule:   { label: "Annulé",   className: "bg-red-100 text-red-600" },
};

const priorityColors: Record<string, string> = {
  basse:   "bg-gray-100 text-gray-600",
  moyenne: "bg-blue-100 text-blue-700",
  haute:   "bg-orange-100 text-orange-700",
  urgente: "bg-red-100 text-red-700",
};

interface Props {
  project: ProjectData;
  developmentTracking: {
    totalActions: number;
    completedActions: number;
    inProgressActions: number;
    blockedActions: number;
    overdueActions: number;
    totalMilestones: number;
    completedMilestones: number;
  };
  clients: { id: string; companyName: string }[];
  allProjects: { id: string; name: string; clientId: string }[];
  users: { id: string; fullName: string }[];
  currentUserId: string;
  currentUserRole: string;
}

export function ProjectDetailClient({
  project,
  developmentTracking,
  clients,
  allProjects,
  users,
  currentUserId,
  currentUserRole,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [, startTransition] = useTransition();

  const sCfg = statusConfig[project.status] ?? statusConfig.nouveau;
  const completedMilestones = project.milestones.filter((m) => m.completed).length;
  const progress = project.milestones.length > 0
    ? Math.round((completedMilestones / project.milestones.length) * 100)
    : 0;
  const developmentProgress = developmentTracking.totalActions > 0
    ? Math.round((developmentTracking.completedActions / developmentTracking.totalActions) * 100)
    : 0;

  const developmentPhase =
    developmentTracking.totalActions === 0
      ? { label: "Initialisation", className: "bg-gray-100 text-gray-600" }
      : developmentTracking.completedActions === developmentTracking.totalActions
        ? { label: "Livraison", className: "bg-green-100 text-green-700" }
        : developmentTracking.blockedActions > 0 || developmentTracking.overdueActions > 0
          ? { label: "Sous surveillance", className: "bg-red-100 text-red-600" }
          : developmentProgress >= 70
            ? { label: "Stabilisation", className: "bg-blue-100 text-blue-700" }
            : { label: "Développement", className: "bg-yellow-100 text-yellow-700" };

  function handleAddMilestone() {
    if (!newMilestone.trim()) return;
    startTransition(async () => {
      await createMilestone(project.id, {
        name: newMilestone.trim(),
        targetDate: newMilestoneDate || undefined,
      });
      setNewMilestone("");
      setNewMilestoneDate("");
    });
  }

  function handleToggleMilestone(milestoneId: string, completed: boolean) {
    startTransition(async () => {
      await updateMilestone(milestoneId, { completed: !completed });
    });
  }

  function handleDeleteMilestone(milestoneId: string) {
    if (!confirm("Supprimer ce jalon ?")) return;
    startTransition(async () => {
      await deleteMilestone(milestoneId);
    });
  }

  const isAdmin = currentUserRole === "admin";

  return (
    <>
      {/* En-tête projet */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sCfg.className}`}>
                  {sCfg.label}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setActionDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Action
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Modifier
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Client</p>
              <Link href={`/clients/${project.clientId}`} className="text-sm text-blue-600 hover:underline">
                {project.client.companyName}
              </Link>
            </div>
          </div>
          {project.owner && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Responsable</p>
                <p className="text-sm text-gray-700">{project.owner.fullName}</p>
              </div>
            </div>
          )}
          {(project.startDate || project.endDate) && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Période</p>
                <p className="text-sm text-gray-700">
                  {project.startDate
                    ? new Date(project.startDate).toLocaleDateString("fr-FR")
                    : "—"}
                  {" → "}
                  {project.endDate
                    ? new Date(project.endDate).toLocaleDateString("fr-FR")
                    : "—"}
                </p>
              </div>
            </div>
          )}
          {isAdmin && project.budget !== null && (
            <div className="flex items-start gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Budget</p>
                <p className="text-sm text-gray-700">
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(project.budget)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Barre de progression milestones */}
        {project.milestones.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progression jalons</span>
              <span>{completedMilestones}/{project.milestones.length} ({progress}%)</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Suivi phase développement</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${developmentPhase.className}`}>
              {developmentPhase.label}
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Avancement des actions</span>
              <span>
                {developmentTracking.completedActions}/{developmentTracking.totalActions} ({developmentProgress}%)
              </span>
            </div>
            <div className="h-1.5 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${developmentProgress}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
            <div className="rounded-md bg-white px-2.5 py-2 border border-gray-100">
              <p className="text-gray-400">En cours</p>
              <p className="text-gray-800 font-medium">{developmentTracking.inProgressActions}</p>
            </div>
            <div className="rounded-md bg-white px-2.5 py-2 border border-gray-100">
              <p className="text-gray-400">Bloquées</p>
              <p className="text-red-600 font-medium">{developmentTracking.blockedActions}</p>
            </div>
            <div className="rounded-md bg-white px-2.5 py-2 border border-gray-100">
              <p className="text-gray-400">En retard</p>
              <p className="text-red-600 font-medium">{developmentTracking.overdueActions}</p>
            </div>
            <div className="rounded-md bg-white px-2.5 py-2 border border-gray-100">
              <p className="text-gray-400">Jalons livrés</p>
              <p className="text-gray-800 font-medium">
                {developmentTracking.completedMilestones}/{developmentTracking.totalMilestones}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Jalons + Actions récentes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Jalons */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Jalons <span className="text-gray-400 font-normal">({project.milestones.length})</span>
              </h2>
            </div>

            <div className="p-5 space-y-2">
              {project.milestones.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun jalon</p>
              )}
              {project.milestones.map((m) => {
                const isOverdue = !m.completed && m.targetDate && new Date(m.targetDate) < new Date();
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 group">
                    <button
                      onClick={() => handleToggleMilestone(m.id, m.completed)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        m.completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 hover:border-blue-400"
                      }`}
                    >
                      {m.completed && <Check className="w-3 h-3" />}
                    </button>
                    <span className={`flex-1 text-sm ${m.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {m.name}
                    </span>
                    {m.targetDate && (
                      <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600" : "text-gray-400"}`}>
                        {isOverdue && <AlertTriangle className="w-3 h-3" />}
                        {new Date(m.targetDate).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* Ajouter jalon */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                <Input
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  placeholder="Nouveau jalon..."
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddMilestone(); }}
                />
                <Input
                  type="date"
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
                <Button size="sm" onClick={handleAddMilestone} disabled={!newMilestone.trim()}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Actions récentes */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Actions en cours <span className="text-gray-400 font-normal">({project._count.actions})</span>
              </h2>
              <Link href={`/actions?project_id=${project.id}`}>
                <Button variant="ghost" size="sm">Voir tout</Button>
              </Link>
            </div>
            {project.actions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Aucune action en cours</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {project.actions.map((action) => {
                  const isOverdue = action.status !== "termine" && new Date(action.dueDate) < new Date();
                  return (
                    <div key={action.id} className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{action.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColors[action.priority]}`}>
                              {action.priority}
                            </span>
                            <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? "text-red-600" : "text-gray-400"}`}>
                              <Clock className="w-3 h-3" />
                              {new Date(action.dueDate).toLocaleDateString("fr-FR")}
                            </span>
                            <span className="text-xs text-gray-400">{action.assignee.fullName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : Pièces jointes + Historique */}
        <div className="space-y-6">
          {/* Assistant IA */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-purple-50">
                <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Assistant IA</h2>
            </div>
            <AiPanel
              clientId={project.clientId}
              projectId={project.id}
              features={["action_suggestion", "health_analysis"]}
            />
          </div>

          {/* Pièces jointes */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <AttachmentsPanel
              projectId={project.id}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Historique récent</h2>
            </div>
            {project.activityLogs.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">Aucune activité</p>
              </div>
            ) : (
              <div className="px-5 py-3 space-y-3">
                {project.activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-700">{log.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {log.user?.fullName} · {new Date(log.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        clients={clients}
        users={users}
        currentUserRole={currentUserRole}
      />

      <ActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        clients={clients}
        projects={allProjects}
        users={users}
        defaultClientId={project.clientId}
        defaultProjectId={project.id}
      />
    </>
  );
}
