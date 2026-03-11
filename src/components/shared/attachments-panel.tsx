"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Paperclip, Upload, Trash2, FileText, Image, File, Download,
} from "lucide-react";

type Attachment = {
  id: string;
  filename: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  uploader: { fullName: string } | null;
};

interface AttachmentsPanelProps {
  clientId?: string;
  projectId?: string;
  actionId?: string;
  currentUserId: string;
  currentUserRole: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="w-4 h-4 text-gray-400" />;
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-400" />;
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-400" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

export function AttachmentsPanel({
  clientId, projectId, actionId, currentUserId, currentUserRole,
}: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUserRole === "admin";

  useEffect(() => {
    loadAttachments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId, actionId]);

  async function loadAttachments() {
    const params = new URLSearchParams();
    if (clientId) params.set("client_id", clientId);
    if (projectId) params.set("project_id", projectId);
    if (actionId) params.set("action_id", actionId);

    try {
      const res = await fetch(`/api/attachments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch {
      // silently fail
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (clientId) formData.append("clientId", clientId);
    if (projectId) formData.append("projectId", projectId);
    if (actionId) formData.append("actionId", actionId);

    try {
      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAttachments((prev) => [data, ...prev]);
      } else {
        setError(data.error ?? "Erreur lors de l'upload");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer cette pièce jointe ?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-gray-400" />
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Pièces jointes ({attachments.length})
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleUpload}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {uploading ? "Upload..." : "Ajouter"}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Aucune pièce jointe</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg group"
            >
              <FileIcon mimeType={att.mimeType} />
              <div className="flex-1 min-w-0">
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-800 hover:text-blue-600 truncate block"
                  download={att.filename}
                >
                  {att.filename}
                </a>
                <p className="text-xs text-gray-400">
                  {formatFileSize(att.fileSize)} · {att.uploader?.fullName} ·{" "}
                  {new Date(att.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={att.fileUrl} download={att.filename}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Download className="w-3 h-3" />
                  </Button>
                </a>
                {(isAdmin || att.uploader?.fullName === currentUserId) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(att.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
