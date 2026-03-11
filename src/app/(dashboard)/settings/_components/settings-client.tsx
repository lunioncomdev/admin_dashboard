"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { User, Shield, Plus, Pencil, UserX, UserCheck, Key, Sparkles } from "lucide-react";

type UserItem = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { assignedActions: number; ownedProjects: number };
};

interface SettingsClientProps {
  currentUser: { id: string; fullName: string; email: string; role: string };
  users: UserItem[];
  isAdmin: boolean;
}

export function SettingsClient({ currentUser, users: initialUsers, isAdmin }: SettingsClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [activeTab, setActiveTab] = useState<"profile" | "users" | "password" | "ai">("profile");
  const [isPending, startTransition] = useTransition();

  // Dialog état
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Formulaires
  const [profileName, setProfileName] = useState(currentUser.fullName);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Nouveau/Edit utilisateur
  const [userForm, setUserForm] = useState({
    fullName: "", email: "", password: "", role: "user", isActive: true,
  });

  async function handleSaveProfile() {
    startTransition(async () => {
      await fetch(`/api/settings/users/${currentUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profileName }),
      });
    });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }
    if (passwordForm.new.length < 8) {
      setPasswordError("Mot de passe trop court (minimum 8 caractères)");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setPasswordError(data.error);
      } else {
        setPasswordSuccess(true);
        setPasswordForm({ current: "", new: "", confirm: "" });
      }
    });
  }

  function openNewUser() {
    setEditingUser(null);
    setUserForm({ fullName: "", email: "", password: "", role: "user", isActive: true });
    setUserDialogOpen(true);
  }

  function openEditUser(user: UserItem) {
    setEditingUser(user);
    setUserForm({ fullName: user.fullName, email: user.email, password: "", role: user.role, isActive: user.isActive });
    setUserDialogOpen(true);
  }

  async function handleSaveUser() {
    startTransition(async () => {
      if (editingUser) {
        const body: Record<string, unknown> = {
          fullName: userForm.fullName,
          role: userForm.role,
          isActive: userForm.isActive,
        };
        if (userForm.password) body.password = userForm.password;

        const res = await fetch(`/api/settings/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u));
          setUserDialogOpen(false);
        }
      } else {
        const res = await fetch("/api/settings/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        });
        if (res.ok) {
          const newUser = await res.json();
          setUsers((prev) => [...prev, { ...newUser, createdAt: new Date().toISOString(), _count: { assignedActions: 0, ownedProjects: 0 } }]);
          setUserDialogOpen(false);
        }
      }
    });
  }

  async function handleToggleActive(user: UserItem) {
    const action = user.isActive ? "Désactiver" : "Réactiver";
    if (!confirm(`${action} l'utilisateur "${user.fullName}" ?`)) return;

    startTransition(async () => {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u)
        );
      }
    });
  }

  // Config IA (admin)
  const [aiConfig, setAiConfig] = useState<{
    isEnabled: boolean; modelName: string; monthlyBudget: string; currentSpend: number;
  } | null>(null);
  const [aiLoaded, setAiLoaded] = useState(false);

  async function loadAiConfig() {
    if (aiLoaded) return;
    const res = await fetch("/api/ai/config");
    if (res.ok) {
      const data = await res.json();
      setAiConfig({
        isEnabled: data.isEnabled,
        modelName: data.modelName,
        monthlyBudget: String(data.monthlyBudget),
        currentSpend: Number(data.currentSpend),
      });
      setAiLoaded(true);
    }
  }

  async function handleSaveAiConfig() {
    if (!aiConfig) return;
    startTransition(async () => {
      await fetch("/api/ai/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiConfig),
      });
    });
  }

  const tabs = [
    { key: "profile", label: "Mon profil", icon: User },
    { key: "password", label: "Mot de passe", icon: Key },
    ...(isAdmin ? [
      { key: "users", label: "Utilisateurs", icon: Shield },
      { key: "ai", label: "Assistant IA", icon: Sparkles },
    ] : []),
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gérez votre compte et les utilisateurs</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "profile" | "password" | "users" | "ai")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu */}
        <div className="flex-1">
          {/* Onglet Profil */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Mon profil</h2>
              <div className="space-y-4 max-w-sm">
                <div className="space-y-1.5">
                  <Label>Nom complet</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={currentUser.email} disabled className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Rôle</Label>
                  <Input value={currentUser.role === "admin" ? "Administrateur" : "Utilisateur"} disabled className="bg-gray-50 capitalize" />
                </div>
                <Button onClick={handleSaveProfile} disabled={isPending || profileName === currentUser.fullName}>
                  {isPending ? "Enregistrement..." : "Sauvegarder"}
                </Button>
              </div>
            </div>
          )}

          {/* Onglet Mot de passe */}
          {activeTab === "password" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Changer le mot de passe</h2>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                <div className="space-y-1.5">
                  <Label>Mot de passe actuel</Label>
                  <Input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirmer le mot de passe</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                  />
                </div>
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-green-600">Mot de passe modifié avec succès !</p>}
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Modification..." : "Modifier le mot de passe"}
                </Button>
              </form>
            </div>
          )}

          {/* Onglet Utilisateurs (admin) */}
          {activeTab === "users" && isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">
                  Utilisateurs <span className="text-gray-400 font-normal text-sm">({users.length})</span>
                </h2>
                <Button size="sm" onClick={openNewUser}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Ajouter
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Utilisateur</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Rôle</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Activité</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{user.fullName}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {user.role === "admin" ? "Admin" : "Utilisateur"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">
                        {user._count.assignedActions} actions · {user._count.ownedProjects} projets
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
                          {user.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => openEditUser(user)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {user.id !== currentUser.id && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => handleToggleActive(user)}
                              title={user.isActive ? "Désactiver" : "Réactiver"}
                            >
                              {user.isActive
                                ? <UserX className="w-3.5 h-3.5 text-red-500" />
                                : <UserCheck className="w-3.5 h-3.5 text-green-600" />
                              }
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Onglet IA (admin) */}
          {activeTab === "ai" && isAdmin && (() => {
            if (!aiLoaded) loadAiConfig();
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5">Configuration de l'Assistant IA</h2>

                {!aiConfig ? (
                  <p className="text-sm text-gray-400">Chargement...</p>
                ) : (
                  <div className="space-y-5 max-w-sm">
                    {/* Activer/Désactiver */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Assistant IA activé</p>
                        <p className="text-xs text-gray-500">Active ou désactive les fonctionnalités IA pour tous</p>
                      </div>
                      <button
                        onClick={() => setAiConfig((c) => c ? { ...c, isEnabled: !c.isEnabled } : c)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          aiConfig.isEnabled ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          aiConfig.isEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>

                    {/* Modèle */}
                    <div className="space-y-1.5">
                      <Label>Modèle OpenAI</Label>
                      <Select
                        value={aiConfig.modelName}
                        onValueChange={(v) => setAiConfig((c) => c ? { ...c, modelName: v } : c)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini (économique)</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o (recommandé)</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">gpt-4o-mini est 10x moins cher que gpt-4o</p>
                    </div>

                    {/* Budget mensuel */}
                    <div className="space-y-1.5">
                      <Label>Budget mensuel (€)</Label>
                      <Input
                        type="number"
                        step="5"
                        min="0"
                        value={aiConfig.monthlyBudget}
                        onChange={(e) => setAiConfig((c) => c ? { ...c, monthlyBudget: e.target.value } : c)}
                      />
                      <p className="text-xs text-gray-400">
                        Dépensé ce mois : {Number(aiConfig.currentSpend).toFixed(4)} €
                      </p>
                    </div>

                    <Button onClick={handleSaveAiConfig} disabled={isPending}>
                      {isPending ? "Enregistrement..." : "Sauvegarder"}
                    </Button>

                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        La clé OpenAI est configurée dans le fichier <code className="bg-gray-100 px-1 rounded">.env.local</code> (variable <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code>).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Dialog utilisateur */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nom complet *</Label>
              <Input
                value={userForm.fullName}
                onChange={(e) => setUserForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Prénom Nom"
              />
            </div>
            {!editingUser && (
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@company.com"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{editingUser ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe *"}</Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? "••••••••" : "Minimum 8 caractères"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select
                value={userForm.role}
                onValueChange={(v) => setUserForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveUser} disabled={isPending}>
                {isPending ? "Enregistrement..." : editingUser ? "Modifier" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
