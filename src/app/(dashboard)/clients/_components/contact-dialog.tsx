"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createContact, updateContact, type ContactFormData } from "@/actions/clients";

interface Contact {
  id: string;
  fullName: string;
  jobTitle?: string | null;
  email: string;
  phone?: string | null;
  isPrimary: boolean;
  notes?: string | null;
}

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contact?: Contact;
}

export function ContactDialog({ open, onOpenChange, clientId, contact }: ContactDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<ContactFormData>({
    defaultValues: {
      fullName: contact?.fullName ?? "",
      jobTitle: contact?.jobTitle ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      isPrimary: contact?.isPrimary ?? false,
      notes: contact?.notes ?? "",
    },
  });

  function onSubmit(data: ContactFormData) {
    setError(null);
    startTransition(async () => {
      const result = contact
        ? await updateContact(clientId, contact.id, data)
        : await createContact(clientId, data);

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Modifier le contact" : "Ajouter un contact"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="fullName">Nom complet *</Label>
            <Input id="fullName" {...register("fullName")} className="mt-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="jobTitle">Poste</Label>
              <Input id="jobTitle" {...register("jobTitle")} className="mt-1.5" placeholder="Ex: Directeur IT" />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register("phone")} className="mt-1.5" placeholder="+33 6..." />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register("email")} className="mt-1.5" />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isPrimary"
              type="checkbox"
              {...register("isPrimary")}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isPrimary" className="cursor-pointer font-normal">
              Contact principal
            </Label>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} className="mt-1.5 resize-none" rows={2} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : contact ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
