"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "./action-dialog";
import { ActionDetailPanel } from "./action-detail-panel";
import { deleteAction, updateActionStatus } from "@/actions/actions";
import {
  Plus, Search, CheckSquare, Clock, AlertTriangle,
  MoreHorizontal, Pencil, Trash2, LayoutList, Columns3,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActionItem = {
  id: string;
  title: string;
  description: string | null;
  clientId: string;
  projectId: string;
  assignedTo: string;
  priority: string;
  status: string;
  dueDate: Date;
  client: { id: string; companyName: string };
  project: { id: string; name: string };
  assignee: { id: string; fullName: string };
  _count: { comments: number };
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  basse:   { label: "Basse",   className: "bg-gray-100 text-gray-600" },
  moyenne: { label: "Moyenne", className: "bg-blue-100 text-blue-700" },
  haute:   { label: "Haute",   className: "bg-orange-100 text-orange-700" },
  urgente: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  a_faire:  { label: "À faire",    className: "bg-gray-100 text-gray-600" },
  en_cours: { label: "En cours",   className: "bg-blue-100 text-blue-700" },
  termine:  { label: "Terminé",    className: "bg-green-100 text-green-700" },
  bloque:   { label: "Bloqué",     className: "bg-red-100 text-red-700" },
};

const KANBAN_COLUMNS = [
  { key: "a_faire",  label: "À faire" },
  { key: "en_cours", label: "En cours" },
  { key: "bloque",   label: "Bloqué" },
  { key: "termine",  label: "Terminé" },
];

interface ActionsListProps {
  actions: ActionItem[];
  total: number;
  clients: { id: string; companyName: string }[];
  projects: { id: string; name: string; clientId: string }[];
  users: { id: string; fullName: string }[];
  currentUserRole: string;
  currentUserId: string;
}

export function ActionsList({
  actions, total, clients, projects, users, currentUserRole, currentUserId,
}: ActionsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<"list" | "kanban">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | undefined>();
  const [detailActionId, setDetailActionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isAdmin = currentUserRole === "admin";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer cette action ?")) return;
    startTransition(async () => {
      await deleteAction(id);
    });
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateActionStatus(id, status as "a_faire" | "en_cours" | "termine" | "bloque");
    });
  }

  const overdueCount = actions.filter(
    (a) => a.status !== "termine" && new Date(a.dueDate) < new Date()
  ).length;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Actions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} action{total > 1 ? "s" : ""}
            {overdueCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {overdueCount} en retard
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vue */}
          <div className="flex items-center border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded ${view === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded ${view === "kanban" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => { setEditingAction(undefined); setDialogOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouvelle action
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-9"
            defaultValue={searchParams.get("search") ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setTimeout(() => updateFilter("search", v), 400);
            }}
          />
        </div>

        <Select
          defaultValue={searchParams.get("status") ?? "all"}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="a_faire">À faire</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="bloque">Bloqué</SelectItem>
            <SelectItem value="termine">Terminé</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("priority") ?? "all"}
          onValueChange={(v) => updateFilter("priority", v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="moyenne">Moyenne</SelectItem>
            <SelectItem value="basse">Basse</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("assigned_to") ?? "all"}
          onValueChange={(v) => updateFilter("assigned_to", v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Assigné à" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value={currentUserId}>Mes actions</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vue liste */}
      {view === "list" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckSquare className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">Aucune action</p>
              <p className="text-xs text-gray-400 mt-1">Créez votre première action</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Client / Projet</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Assigné</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Priorité</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Échéance</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {actions.map((action) => {
                  const isOverdue =
                    action.status !== "termine" &&
                    new Date(action.dueDate) < new Date();
                  const pCfg = priorityConfig[action.priority] ?? priorityConfig.moyenne;
                  const sCfg = statusConfig[action.status] ?? statusConfig.a_faire;

                  return (
                    <tr
                      key={action.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setDetailActionId(action.id)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900 truncate max-w-[220px]">
                          {action.title}
                        </p>
                        {action._count.comments > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {action._count.comments} commentaire{action._count.comments > 1 ? "s" : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-gray-700">{action.client.companyName}</p>
                        <p className="text-xs text-gray-400">{action.project.name}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{action.assignee.fullName}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pCfg.className}`}>
                          {pCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sCfg.className}`}>
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                          {isOverdue && <AlertTriangle className="w-3 h-3" />}
                          <Clock className="w-3 h-3" />
                          {new Date(action.dueDate).toLocaleDateString("fr-FR")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingAction(action); setDialogOpen(true); }}>
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(action.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Vue Kanban */}
      {view === "kanban" && (
        <div className="grid grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colActions = actions.filter((a) => a.status === col.key);
            return (
              <div key={col.key} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {col.label}
                  </h3>
                  <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                    {colActions.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colActions.map((action) => {
                    const isOverdue =
                      action.status !== "termine" &&
                      new Date(action.dueDate) < new Date();
                    const pCfg = priorityConfig[action.priority] ?? priorityConfig.moyenne;

                    return (
                      <div
                        key={action.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-sm transition-shadow"
                        onClick={() => setDetailActionId(action.id)}
                      >
                        <p className="text-sm font-medium text-gray-900 leading-snug">
                          {action.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{action.client.companyName}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${pCfg.className}`}>
                            {pCfg.label}
                          </span>
                          <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? "text-red-600" : "text-gray-400"}`}>
                            {isOverdue && <AlertTriangle className="w-3 h-3" />}
                            {new Date(action.dueDate).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">{action.assignee.fullName}</p>

                        {/* Changer statut rapide */}
                        <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {KANBAN_COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                            <button
                              key={c.key}
                              onClick={() => handleStatusChange(action.id, c.key)}
                              className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                              title={`Déplacer vers ${c.label}`}
                            >
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Panel détail action */}
      {detailActionId && (
        <ActionDetailPanel
          actionId={detailActionId}
          users={users}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setDetailActionId(null)}
          onEdit={(action) => {
            setEditingAction(action as unknown as ActionItem);
            setDialogOpen(true);
          }}
        />
      )}

      {/* Dialog */}
      <ActionDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingAction(undefined); }}
        action={editingAction}
        clients={clients}
        projects={projects}
        users={users}
      />
    </div>
  );
}
