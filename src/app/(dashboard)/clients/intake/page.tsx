"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ArrowLeft, Save } from "lucide-react";
import { createClient, createContact } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type IntakeFormValues = {
  // Informations générales
  companyName: string;
  legalName: string;
  principalContactName: string;
  principalContactRole: string;
  phone: string;
  email: string;
  otherContacts: string;
  contractSignDate: string;
  projectType: string[]; // "standard" | "custom"
  priorityLevel: string[]; // "haute" | "moyen" | "basse"
  
  // Contexte & objectifs business
  purchaseReason: string;
  businessObjectives: string[]; // checkboxes
  objectivesOther: string;
  expectedKpis: string;
  
  // Périmètre contractuel
  subscribedPack: string;
};

function formatToday() {
  return new Date().toISOString().split("T")[0];
}

const projectTypeOptions = [
  { value: "standard", label: "Standard" },
  { value: "custom", label: "Custom" },
];

const priorityOptions = [
  { value: "haute", label: "Haute" },
  { value: "moyen", label: "Moyen" },
  { value: "basse", label: "Basse" },
];

const businessObjectiveOptions = [
  { value: "leads", label: "Génération de leads" },
  { value: "ca", label: "Augmentation du CA" },
  { value: "automation", label: "Automatisation du traitement devis" },
  { value: "prospects", label: "Relance prospects" },
  { value: "planning", label: "Optimisation planning" },
  { value: "other", label: "Autre / commentaires" },
];

export default function ClientIntakePage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const defaultValues = useMemo<IntakeFormValues>(
    () => ({
      companyName: "",
      legalName: "",
      principalContactName: "",
      principalContactRole: "",
      phone: "",
      email: "",
      otherContacts: "",
      contractSignDate: formatToday(),
      projectType: [],
      priorityLevel: [],
      purchaseReason: "",
      businessObjectives: [],
      objectivesOther: "",
      expectedKpis: "",
      subscribedPack: "",
    }),
    []
  );

  const { register, handleSubmit, watch, reset, control } = useForm<IntakeFormValues>({
    defaultValues,
  });

  function buildClientNotes(values: IntakeFormValues) {
    const sections: string[] = [];

    // Info générales
    if (values.legalName.trim()) {
      sections.push(`Raison sociale: ${values.legalName.trim()}`);
    }
    if (values.otherContacts.trim()) {
      sections.push(`Autres contacts clés:\n${values.otherContacts.trim()}`);
    }
    if (values.contractSignDate.trim()) {
      sections.push(`Date de signature du contrat: ${values.contractSignDate.trim()}`);
    }
    if (values.projectType.length > 0) {
      sections.push(`Type de projet: ${values.projectType.join(", ")}`);
    }
    if (values.priorityLevel.length > 0) {
      sections.push(`Niveau de priorité: ${values.priorityLevel.join(", ")}`);
    }

    // Contexte business
    if (values.purchaseReason.trim()) {
      sections.push(`Pourquoi le client a acheté (Problème principal):\n${values.purchaseReason.trim()}`);
    }
    if (values.businessObjectives.length > 0) {
      const labelledObjectives = values.businessObjectives
        .map((val) => businessObjectiveOptions.find((o) => o.value === val)?.label || val)
        .join(", ");
      sections.push(`Objectifs prioritaires: ${labelledObjectives}`);
    }
    if (values.objectivesOther.trim()) {
      sections.push(`Autres objectifs:\n${values.objectivesOther.trim()}`);
    }
    if (values.expectedKpis.trim()) {
      sections.push(`KPIs attendus:\n${values.expectedKpis.trim()}`);
    }

    // Périmètre contractuel
    if (values.subscribedPack.trim()) {
      sections.push(`Offre souscrite / Pack: ${values.subscribedPack.trim()}`);
    }

    return sections.join("\n\n");
  }

  function onSubmit(values: IntakeFormValues) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      if (!values.companyName.trim()) {
        setError("Le nom du client est obligatoire.");
        return;
      }

      const compiledNotes = buildClientNotes(values);

      const created = await createClient({
        companyName: values.companyName.trim(),
        notes: compiledNotes || undefined,
        status: "prospect",
      });

      if (created.error || !created.id) {
        setError(created.error ?? "Impossible de créer le client.");
        return;
      }

      // Create primary contact if email is provided
      if (values.email.trim()) {
        const contactCreated = await createContact(created.id, {
          fullName: values.principalContactName.trim() || "Contact principal",
          jobTitle: values.principalContactRole.trim() || undefined,
          email: values.email.trim(),
          phone: values.phone.trim() || undefined,
          isPrimary: true,
          notes: "Contact principal saisi via brief de passation client.",
        });

        if (contactCreated.error) {
          setSuccess(
            "Client créé, mais le contact principal n'a pas pu être enregistré."
          );
          setError(contactCreated.error);
          return;
        }
      }

      setSuccess("Brief enregistré avec succès.");
      reset(defaultValues);
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brief de passation client</h1>
          <p className="text-sm text-gray-500 mt-0.5">(Handoff CSM)</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/clients">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Retour clients
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Informations générales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-3">Informations générales</h2>

          <div>
            <Label htmlFor="companyName">Nom du client *</Label>
            <Input id="companyName" className="mt-1.5" {...register("companyName", { required: true })} />
          </div>

          <div>
            <Label htmlFor="legalName">Raison sociale</Label>
            <Input id="legalName" className="mt-1.5" {...register("legalName")} />
          </div>

          <div>
            <Label htmlFor="principalContactName">Contact principal (nom + rôle)</Label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <Input id="principalContactName" placeholder="Nom" {...register("principalContactName")} />
              <Input id="principalContactRole" placeholder="Rôle" {...register("principalContactRole")} />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" className="mt-1.5" {...register("phone")} />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className="mt-1.5" {...register("email")} />
          </div>

          <div>
            <Label htmlFor="otherContacts">Autres contacts clés</Label>
            <Textarea id="otherContacts" rows={2} className="mt-1.5 resize-none" {...register("otherContacts")} />
          </div>

          <div>
            <Label htmlFor="contractSignDate">Date de signature du contrat</Label>
            <Input id="contractSignDate" type="date" className="mt-1.5" {...register("contractSignDate")} />
          </div>

          {/* Type de projet checkboxes */}
          <div>
            <Label>Type de projet</Label>
            <div className="flex gap-6 mt-2">
              {projectTypeOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={option.value}
                    {...register("projectType")}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority level checkboxes */}
          <div>
            <Label>Niveau de priorité</Label>
            <div className="flex gap-6 mt-2">
              {priorityOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={option.value}
                    {...register("priorityLevel")}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Contexte & objectifs business */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-3">Contexte & objectifs business</h2>

          <div>
            <Label htmlFor="purchaseReason">Pourquoi le client a acheté ?</Label>
            <p className="text-xs text-gray-500 mt-0.5 mb-2">Problème principal à résoudre</p>
            <Textarea id="purchaseReason" rows={3} className="mt-1.5 resize-none" {...register("purchaseReason")} />
          </div>

          {/* Business objectives checkboxes */}
          <div>
            <Label>Objectifs prioritaires</Label>
            <div className="space-y-2 mt-2">
              {businessObjectiveOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={option.value}
                    {...register("businessObjectives")}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="objectivesOther">Autre / commentaires</Label>
            <Textarea id="objectivesOther" rows={3} className="mt-1.5 resize-none" {...register("objectivesOther")} />
          </div>

          <div>
            <Label htmlFor="expectedKpis">KPIs attendus</Label>
            <Textarea id="expectedKpis" rows={3} className="mt-1.5 resize-none" {...register("expectedKpis")} />
          </div>
        </div>

        {/* Section 3: Périmètre contractuel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-3">Périmètre contractuel</h2>

          <div>
            <Label htmlFor="subscribedPack">Offre souscrite / Pack</Label>
            <Input id="subscribedPack" className="mt-1.5" {...register("subscribedPack")} />
          </div>
        </div>

        {/* Messages d'erreur / succès */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            <Save className="w-4 h-4 mr-1.5" />
            {isPending ? "Enregistrement..." : "Enregistrer le brief"}
          </Button>
        </div>
      </form>
    </div>
  );
}
