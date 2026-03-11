"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient, updateClient, type ClientFormData } from "@/actions/clients";

interface User { id: string; fullName: string }

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: {
    id: string;
    companyName: string;
    address?: string | null;
    sector?: string | null;
    startDate?: Date | null;
    csmId?: string | null;
    status: string;
    notes?: string | null;
  };
  users: User[];
  currentUserRole: string;
}

export function ClientDialog({ open, onOpenChange, client, users, currentUserRole }: ClientDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isAdmin = currentUserRole === "admin";

  const { register, handleSubmit, setValue, watch, reset } = useForm<ClientFormData>({
    defaultValues: {
      companyName: client?.companyName ?? "",
      address: client?.address ?? "",
      sector: client?.sector ?? "",
      startDate: client?.startDate ? new Date(client.startDate).toISOString().split("T")[0] : "",
      csmId: client?.csmId ?? "",
      status: (client?.status as ClientFormData["status"]) ?? "prospect",
      notes: client?.notes ?? "",
    },
  });

  const statusValue = watch("status");
  const csmValue = watch("csmId");

  useEffect(() => {
    if (!open) return;

    if (client) {
      reset({
        companyName: client.companyName,
        address: client.address ?? "",
        sector: client.sector ?? "",
        startDate: client.startDate ? new Date(client.startDate).toISOString().split("T")[0] : "",
        csmId: client.csmId ?? "",
        status: (client.status as ClientFormData["status"]) ?? "prospect",
        notes: client.notes ?? "",
      });
      return;
    }

    reset({
      companyName: "",
      address: "",
      sector: "",
      startDate: "",
      csmId: "",
      status: "prospect",
      notes: "",
    });
  }, [open, client, reset]);

  function onSubmit(data: ClientFormData) {
    setError(null);
    startTransition(async () => {
      const result = client
        ? await updateClient(client.id, data)
        : await createClient(data);

      if (result.error) {
        setError(result.error);
      } else {
        reset();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="companyName">Nom de l&apos;entreprise *</Label>
            <Input id="companyName" {...register("companyName")} className="mt-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sector">Secteur</Label>
              <Input id="sector" {...register("sector")} className="mt-1.5" placeholder="Ex: Technologie" />
            </div>
            <div>
              <Label htmlFor="startDate">Date de début</Label>
              <Input id="startDate" type="date" {...register("startDate")} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" {...register("address")} className="mt-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Statut</Label>
              <Select
                value={statusValue}
                onValueChange={(v) => setValue("status", v as ClientFormData["status"])}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div>
                <Label>CSM assigné</Label>
                <Select
                  value={csmValue ?? ""}
                  onValueChange={(v) => setValue("csmId", v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} className="mt-1.5 resize-none" rows={3} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : client ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
