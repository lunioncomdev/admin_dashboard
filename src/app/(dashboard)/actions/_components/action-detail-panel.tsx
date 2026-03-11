"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createComment, deleteComment } from "@/actions/actions";
import { AttachmentsPanel } from "@/components/shared/attachments-panel";
import {
  X, Pencil, Clock, User, Building2, FolderOpen,
  MessageSquare, Trash2, AlertTriangle,
} from "lucide-react";

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; fullName: string };
};

type ActionDetail = {
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
  creator: { id: string; fullName: string } | null;
  comments: Comment[];
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  basse:   { label: "Basse",   className: "bg-gray-100 text-gray-600" },
  moyenne: { label: "Moyenne", className: "bg-blue-100 text-blue-700" },
  haute:   { label: "Haute",   className: "bg-orange-100 text-orange-700" },
  urgente: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  a_faire:  { label: "À faire",  className: "bg-gray-100 text-gray-600" },
  en_cours: { label: "En cours", className: "bg-blue-100 text-blue-700" },
  termine:  { label: "Terminé",  className: "bg-green-100 text-green-700" },
  bloque:   { label: "Bloqué",   className: "bg-red-100 text-red-700" },
};

interface ActionDetailPanelProps {
  actionId: string;
  users: { id: string; fullName: string }[];
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onEdit: (action: ActionDetail) => void;
}

export function ActionDetailPanel({
  actionId, currentUserId, currentUserRole, onClose, onEdit,
}: ActionDetailPanelProps) {
  const [action, setAction] = useState<ActionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const isAdmin = currentUserRole === "admin";

  useEffect(() => {
    setLoading(true);
    fetch(`/api/actions/${actionId}`)
      .then((r) => r.json())
      .then((data) => { setAction(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [actionId]);

  function handleAddComment() {
    if (!comment.trim()) return;
    startTransition(async () => {
      await createComment(actionId, comment.trim());
      setComment("");
      // Recharger
      const updated = await fetch(`/api/actions/${actionId}`).then((r) => r.json());
      setAction(updated);
    });
  }

  function handleDeleteComment(commentId: string) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    startTransition(async () => {
      await deleteComment(commentId);
      const updated = await fetch(`/api/actions/${actionId}`).then((r) => r.json());
      setAction(updated);
    });
  }

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-[420px] bg-white border-l border-gray-200 shadow-xl z-40 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!action) return null;

  const isOverdue = action.status !== "termine" && new Date(action.dueDate) < new Date();
  const pCfg = priorityConfig[action.priority] ?? priorityConfig.moyenne;
  const sCfg = statusConfig[action.status] ?? statusConfig.a_faire;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[420px] bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-semibold text-gray-900 leading-snug">
              {action.title}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sCfg.className}`}>
                {sCfg.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pCfg.className}`}>
                {pCfg.label}
              </span>
              {isOverdue && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  En retard
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => { onClose(); onEdit(action); }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Infos */}
          <div className="px-5 py-4 space-y-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500">Client :</span>
              <span className="text-gray-800">{action.client.companyName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500">Projet :</span>
              <span className="text-gray-800">{action.project.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500">Assigné à :</span>
              <span className="text-gray-800">{action.assignee.fullName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500">Échéance :</span>
              <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-800"}>
                {new Date(action.dueDate).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>

          {/* Description */}
          {action.description && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{action.description}</p>
            </div>
          )}

          {/* Commentaires */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Commentaires ({action.comments.length})
              </p>
            </div>

            {action.comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun commentaire</p>
            ) : (
              <div className="space-y-3 mb-4">
                {action.comments.map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-700">{c.author.fullName}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-400">
                          {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                        {(isAdmin || c.author.id === currentUserId) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter un commentaire */}
            <div className="space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows={3}
                className="text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={isPending || !comment.trim()}
                >
                  {isPending ? "Envoi..." : "Commenter"}
                </Button>
              </div>
            </div>
          </div>

          {/* Pièces jointes */}
          <div className="px-5 py-4 border-t border-gray-100">
            <AttachmentsPanel
              actionId={actionId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          </div>
        </div>
      </div>
    </>
  );
}
