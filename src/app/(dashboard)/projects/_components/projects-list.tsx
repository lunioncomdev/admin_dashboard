"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProjectDialog } from "./project-dialog";
import { deleteProject } from "@/actions/projects";
import {
  Plus, Search, FolderOpen, MoreHorizontal, Pencil, Trash2,
  CheckSquare, CalendarDays,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Project = {
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
  _count: { actions: number; milestones: number };
};

const statusConfig: Record<string, { label: string; className: string }> = {
  nouveau:   { label: "Nouveau",   className: "bg-gray-100 text-gray-600" },
  en_cours:  { label: "En cours",  className: "bg-blue-100 text-blue-700" },
  en_pause:  { label: "En pause",  className: "bg-yellow-100 text-yellow-700" },
  termine:   { label: "Terminé",   className: "bg-green-100 text-green-700" },
  annule:    { label: "Annulé",    className: "bg-red-100 text-red-600" },
};

interface ProjectsListProps {
  projects: Project[];
  total: number;
  clients: { id: string; companyName: string }[];
  users: { id: string; fullName: string }[];
  currentUserRole: string;
}

export function ProjectsList({ projects, total, clients, users, currentUserRole }: ProjectsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
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
    if (!confirm("Supprimer ce projet ? Cette action est irréversible.")) return;
    startTransition(async () => {
      await deleteProject(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} projet{total > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setEditingProject(undefined); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau projet
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
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
            <SelectItem value="nouveau">Nouveau</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="en_pause">En pause</SelectItem>
            <SelectItem value="termine">Terminé</SelectItem>
            <SelectItem value="annule">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Aucun projet</p>
            <p className="text-xs text-gray-400 mt-1">Créez votre premier projet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Projet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Responsable</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Dates</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((project) => {
                const sCfg = statusConfig[project.status] ?? statusConfig.nouveau;
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {project.name}
                      </Link>
                      {project.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                          {project.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{project.client.companyName}</td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {project.owner?.fullName ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sCfg.className}`}>
                        {sCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {project.startDate || project.endDate ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <CalendarDays className="w-3 h-3" />
                          {project.startDate
                            ? new Date(project.startDate).toLocaleDateString("fr-FR")
                            : "—"}
                          {" → "}
                          {project.endDate
                            ? new Date(project.endDate).toLocaleDateString("fr-FR")
                            : "—"}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <CheckSquare className="w-3 h-3" />
                        {project._count.actions}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingProject(project); setDialogOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(project.id)}
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

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingProject(undefined); }}
        project={editingProject}
        clients={clients}
        users={users}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
