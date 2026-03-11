"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createProject, updateProject, type ProjectFormData } from "@/actions/projects";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Client requis"),
  ownerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["nouveau", "en_cours", "en_pause", "termine", "annule"]),
  budget: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: {
    id: string;
    name: string;
    description: string | null;
    clientId: string;
    ownerId: string | null;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
    budget: number | null;
  };
  clients: { id: string; companyName: string }[];
  users: { id: string; fullName: string }[];
  currentUserRole: string;
  defaultClientId?: string;
}

const statusLabels = {
  nouveau:   "Nouveau",
  en_cours:  "En cours",
  en_pause:  "En pause",
  termine:   "Terminé",
  annule:    "Annulé",
};

export function ProjectDialog({
  open, onOpenChange, project, clients, users, currentUserRole, defaultClientId,
}: ProjectDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isAdmin = currentUserRole === "admin";

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      clientId: defaultClientId ?? "",
      ownerId: "",
      startDate: "",
      endDate: "",
      status: "nouveau",
      budget: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (project) {
        reset({
          name: project.name,
          description: project.description ?? "",
          clientId: project.clientId,
          ownerId: project.ownerId ?? "",
          startDate: project.startDate
            ? new Date(project.startDate).toISOString().split("T")[0]
            : "",
          endDate: project.endDate
            ? new Date(project.endDate).toISOString().split("T")[0]
            : "",
          status: project.status as FormData["status"],
          budget: project.budget ? String(project.budget) : "",
        });
      } else {
        reset({
          name: "",
          description: "",
          clientId: defaultClientId ?? "",
          ownerId: "",
          startDate: "",
          endDate: "",
          status: "nouveau",
          budget: "",
        });
      }
    }
  }, [open, project, defaultClientId, reset]);

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = project
        ? await updateProject(project.id, data as ProjectFormData)
        : await createProject(data as ProjectFormData);

      if (!result.error) {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" {...register("name")} placeholder="Nom du projet" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={2} placeholder="Description..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select
                value={watch("clientId")}
                onValueChange={(v) => setValue("clientId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-red-500">{errors.clientId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <Select
                value={watch("ownerId") ?? ""}
                onValueChange={(v) => setValue("ownerId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Date début</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Date fin</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as FormData["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="space-y-1.5">
                <Label htmlFor="budget">Budget (€)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  {...register("budget")}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : project ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
