"use client";

import { useEffect, useState, useTransition } from "react";
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
import { createAction, updateAction, type ActionFormData } from "@/actions/actions";

const schema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Client requis"),
  projectId: z.string().min(1, "Projet requis"),
  assignedTo: z.string().min(1, "Assigné requis"),
  priority: z.enum(["basse", "moyenne", "haute", "urgente"]),
  status: z.enum(["a_faire", "en_cours", "termine", "bloque"]),
  dueDate: z.string().min(1, "Date requise"),
});

type FormData = z.infer<typeof schema>;

interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: {
    id: string;
    title: string;
    description: string | null;
    clientId: string;
    projectId: string;
    assignedTo: string;
    priority: string;
    status: string;
    dueDate: Date;
  };
  clients: { id: string; companyName: string }[];
  projects: { id: string; name: string; clientId: string }[];
  users: { id: string; fullName: string }[];
  defaultClientId?: string;
  defaultProjectId?: string;
}

const priorityLabels = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
  urgente: "Urgente",
};

const statusLabels = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
  bloque: "Bloqué",
};

export function ActionDialog({
  open, onOpenChange, action, clients, projects, users,
  defaultClientId, defaultProjectId,
}: ActionDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedClientId, setSelectedClientId] = useState(
    action?.clientId ?? defaultClientId ?? ""
  );

  const filteredProjects = projects.filter(
    (p) => !selectedClientId || p.clientId === selectedClientId
  );

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      clientId: defaultClientId ?? "",
      projectId: defaultProjectId ?? "",
      assignedTo: "",
      priority: "moyenne",
      status: "a_faire",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (action) {
        reset({
          title: action.title,
          description: action.description ?? "",
          clientId: action.clientId,
          projectId: action.projectId,
          assignedTo: action.assignedTo,
          priority: action.priority as FormData["priority"],
          status: action.status as FormData["status"],
          dueDate: new Date(action.dueDate).toISOString().split("T")[0],
        });
        setSelectedClientId(action.clientId);
      } else {
        reset({
          title: "",
          description: "",
          clientId: defaultClientId ?? "",
          projectId: defaultProjectId ?? "",
          assignedTo: "",
          priority: "moyenne",
          status: "a_faire",
          dueDate: "",
        });
        setSelectedClientId(defaultClientId ?? "");
      }
    }
  }, [open, action, defaultClientId, defaultProjectId, reset]);

  const watchClientId = watch("clientId");
  useEffect(() => {
    if (watchClientId !== selectedClientId) {
      setSelectedClientId(watchClientId);
      setValue("projectId", "");
    }
  }, [watchClientId, selectedClientId, setValue]);

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = action
        ? await updateAction(action.id, data as ActionFormData)
        : await createAction(data as ActionFormData);

      if (!result.error) {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{action ? "Modifier l'action" : "Nouvelle action"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Titre */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" {...register("title")} placeholder="Titre de l'action" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={2} placeholder="Détails..." />
          </div>

          {/* Client + Projet */}
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
              <Label>Projet *</Label>
              <Select
                value={watch("projectId")}
                onValueChange={(v) => setValue("projectId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      {selectedClientId ? "Aucun projet" : "Choisir un client d'abord"}
                    </SelectItem>
                  ) : (
                    filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.projectId && <p className="text-xs text-red-500">{errors.projectId.message}</p>}
            </div>
          </div>

          {/* Assigné + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assigné à *</Label>
              <Select
                value={watch("assignedTo")}
                onValueChange={(v) => setValue("assignedTo", v)}
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
              {errors.assignedTo && <p className="text-xs text-red-500">{errors.assignedTo.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Date limite *</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate.message}</p>}
            </div>
          </div>

          {/* Priorité + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priorité</Label>
              <Select
                value={watch("priority")}
                onValueChange={(v) => setValue("priority", v as FormData["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : action ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
