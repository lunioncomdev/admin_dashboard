"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "../../_components/client-dialog";
import { ContactDialog } from "../../_components/contact-dialog";
import { deleteContact } from "@/actions/clients";
import { AttachmentsPanel } from "@/components/shared/attachments-panel";
import { AiPanel } from "@/components/shared/ai-panel";
import {
  Pencil, Plus, Trash2, Star, Building2, MapPin, Calendar,
  User, FolderOpen, CheckSquare, Clock, Mail, Phone,
} from "lucide-react";

type ClientData = {
  id: string;
  companyName: string;
  address: string | null;
  sector: string | null;
  startDate: Date | null;
  csmId: string | null;
  status: "prospect" | "actif" | "inactif";
  notes: string | null;
  csm: { id: string; fullName: string } | null;
  contacts: {
    id: string; fullName: string; jobTitle: string | null; email: string;
    phone: string | null; isPrimary: boolean; notes: string | null;
  }[];
  projects: {
    id: string; name: string; status: string;
    owner: { fullName: string } | null;
    _count: { actions: number };
  }[];
  actions: {
    id: string; title: string; priority: string; dueDate: Date;
    assignee: { fullName: string };
  }[];
  activityLogs: {
    id: string; eventType: string; description: string; createdAt: Date;
    user: { fullName: string } | null;
  }[];
};

const statusConfig = {
  prospect: { label: "Prospect", className: "bg-gray-100 text-gray-600" },
  actif: { label: "Actif", className: "bg-green-100 text-green-700" },
  inactif: { label: "Inactif", className: "bg-red-100 text-red-600" },
};

interface Props {
  client: ClientData;
  users: { id: string; fullName: string }[];
  currentUserId: string;
  currentUserRole: string;
  projectStatusLabels: Record<string, string>;
  projectStatusColors: Record<string, string>;
  priorityColors: Record<string, string>;
}

export function ClientDetailClient({ client, users, currentUserId, currentUserRole, projectStatusLabels, projectStatusColors, priorityColors }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientData["contacts"][0] | undefined>();
  const [, startTransition] = useTransition();

  const statusCfg = statusConfig[client.status];

  function handleDeleteContact(contactId: string) {
    if (!confirm("Supprimer ce contact ?")) return;
    startTransition(async () => {
      await deleteContact(client.id, contactId);
    });
  }

  return (
    <>
      {/* En-tête client */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{client.companyName}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
              {client.sector && <p className="text-sm text-gray-500 mt-0.5">{client.sector}</p>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Modifier
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-100">
          {client.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Adresse</p>
                <p className="text-sm text-gray-700">{client.address}</p>
              </div>
            </div>
          )}
          {client.startDate && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Client depuis</p>
                <p className="text-sm text-gray-700">
                  {new Date(client.startDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          )}
          {client.csm && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">CSM</p>
                <p className="text-sm text-gray-700">{client.csm.fullName}</p>
              </div>
            </div>
          )}
          {client.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Contacts + Projets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contacts */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Contacts <span className="text-gray-400 font-normal">({client.contacts.length})</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditingContact(undefined); setContactDialogOpen(true); }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Ajouter
              </Button>
            </div>
            {client.contacts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Aucun contact</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start justify-between px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900">{contact.fullName}</p>
                          {contact.isPrimary && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        {contact.jobTitle && (
                          <p className="text-xs text-gray-500">{contact.jobTitle}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600">
                            <Mail className="w-3 h-3" />{contact.email}
                          </a>
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600">
                              <Phone className="w-3 h-3" />{contact.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => { setEditingContact(contact); setContactDialogOpen(true); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Projets */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Projets <span className="text-gray-400 font-normal">({client.projects.length})</span>
              </h2>
              <Link href={`/projects?client_id=${client.id}`}>
                <Button variant="ghost" size="sm">Voir tout</Button>
              </Link>
            </div>
            {client.projects.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Aucun projet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.projects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.owner?.fullName} · {project._count.actions} action{project._count.actions > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${projectStatusColors[project.status]}`}>
                      {projectStatusLabels[project.status]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : Actions + Timeline */}
        <div className="space-y-6">
          {/* Actions en cours */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Actions en cours</h2>
              <Link href={`/actions?client_id=${client.id}`}>
                <Button variant="ghost" size="sm">Voir tout</Button>
              </Link>
            </div>
            {client.actions.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">Aucune action</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.actions.map((action) => {
                  const isOverdue = new Date(action.dueDate) < new Date();
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
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pièces jointes */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <AttachmentsPanel
              clientId={client.id}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          </div>

          {/* Assistant IA */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-purple-50">
                <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Assistant IA</h2>
            </div>
            <AiPanel
              clientId={client.id}
              contacts={client.contacts}
            />
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Historique récent</h2>
            </div>
            {client.activityLogs.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">Aucune activité</p>
              </div>
            ) : (
              <div className="px-5 py-3 space-y-3">
                {client.activityLogs.map((log) => (
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
      <ClientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        users={users}
        currentUserRole={currentUserRole}
      />
      <ContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        clientId={client.id}
        contact={editingContact}
      />
    </>
  );
}
