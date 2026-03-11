"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientDialog } from "./client-dialog";
import { deleteClient } from "@/actions/clients";
import { Plus, Search, Building2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Client = {
  id: string;
  companyName: string;
  sector: string | null;
  status: "prospect" | "actif" | "inactif";
  createdAt: Date;
  csm: { fullName: string } | null;
  contacts: { fullName: string; email: string }[];
};

type User = { id: string; fullName: string };

const statusConfig = {
  prospect: { label: "Prospect", className: "bg-gray-100 text-gray-600" },
  actif: { label: "Actif", className: "bg-green-100 text-green-700" },
  inactif: { label: "Inactif", className: "bg-red-100 text-red-600" },
};

interface ClientsListProps {
  clients: Client[];
  users: User[];
  currentUserRole: string;
  total: number;
}

export function ClientsList({ clients, users, currentUserRole, total }: ClientsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();

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

  async function handleDelete(id: string, companyName: string) {
    if (!confirm("Supprimer ce client ? Cette action est irréversible.")) return;

    const validation = prompt(
      `Pour confirmer, tapez exactement le nom du client : ${companyName}`
    );
    if (validation !== companyName) {
      alert("Validation échouée : le nom saisi ne correspond pas.");
      return;
    }

    const result = await deleteClient(id);
    if (result?.error) {
      alert(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} client{total > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/clients/intake">Brief passation</Link>
          </Button>
          <Button onClick={() => { setEditingClient(undefined); setDialogOpen(true); }} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Nouveau client
          </Button>
        </div>
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
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="actif">Actif</SelectItem>
            <SelectItem value="inactif">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Aucun client trouvé</p>
            <p className="text-xs text-gray-400 mt-1">Créez votre premier client</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Entreprise</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Contact principal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Secteur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">CSM</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => {
                const statusCfg = statusConfig[client.status];
                const primaryContact = client.contacts[0];

                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {client.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      {primaryContact ? (
                        <div>
                          <p className="text-gray-700">{primaryContact.fullName}</p>
                          <p className="text-xs text-gray-400">{primaryContact.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{client.sector || "—"}</td>
                    <td className="px-4 py-3.5 text-gray-500">{client.csm?.fullName || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingClient(client); setDialogOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(client.id, client.companyName)}
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

      <ClientDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingClient(undefined); }}
        client={editingClient}
        users={users}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
