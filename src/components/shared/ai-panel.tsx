"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, Copy, Check, Loader2, AlertCircle } from "lucide-react";

type AiFeature =
  | "client_summary"
  | "action_suggestion"
  | "draft_email"
  | "health_analysis";

interface AiPanelProps {
  clientId?: string;
  projectId?: string;
  contacts?: { fullName: string }[];
  /** Quelles fonctionnalités afficher */
  features?: AiFeature[];
}

const featureLabels: Record<AiFeature, string> = {
  client_summary:    "Résumé client",
  action_suggestion: "Suggestions d'actions",
  draft_email:       "Brouillon d'email",
  health_analysis:   "Analyse de santé",
};

const featureDescriptions: Record<AiFeature, string> = {
  client_summary:    "Génère un résumé exécutif de la relation client",
  action_suggestion: "Propose des actions pertinentes à créer",
  draft_email:       "Rédige un email professionnel pour ce client",
  health_analysis:   "Évalue la santé de la relation avec un score et des recommandations",
};

export function AiPanel({ clientId, projectId, contacts = [], features }: AiPanelProps) {
  const defaultFeatures: AiFeature[] = features ?? [
    "client_summary",
    "action_suggestion",
    "draft_email",
    "health_analysis",
  ];

  const [selectedFeature, setSelectedFeature] = useState<AiFeature>(defaultFeatures[0]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Pour draft_email
  const [emailContact, setEmailContact] = useState(contacts[0]?.fullName ?? "");
  const [emailSubject, setEmailSubject] = useState("Point d'avancement");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setResult("");

    let body: Record<string, unknown> = { type: selectedFeature };

    if (clientId) body.clientId = clientId;
    if (projectId && selectedFeature === "action_suggestion") body.projectId = projectId;
    if (selectedFeature === "draft_email") {
      body.contactName = emailContact;
      body.subject = emailSubject;
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.content);
      } else {
        setError(data.error ?? "Erreur inconnue");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Sélection de la fonctionnalité */}
      <div className="grid grid-cols-2 gap-2">
        {defaultFeatures.map((f) => (
          <button
            key={f}
            onClick={() => { setSelectedFeature(f); setResult(""); setError(""); }}
            className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
              selectedFeature === f
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:border-gray-300 text-gray-600"
            }`}
          >
            <p className="font-medium">{featureLabels[f]}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{featureDescriptions[f]}</p>
          </button>
        ))}
      </div>

      {/* Paramètres supplémentaires pour email */}
      {selectedFeature === "draft_email" && (
        <div className="space-y-3 bg-gray-50 rounded-lg p-3">
          {contacts.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Contact</Label>
              <Select value={emailContact} onValueChange={setEmailContact}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.fullName} value={c.fullName}>{c.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du contact</Label>
              <Input
                className="h-8 text-sm"
                value={emailContact}
                onChange={(e) => setEmailContact(e.target.value)}
                placeholder="Prénom Nom"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Objet de l'email</Label>
            <Input
              className="h-8 text-sm"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Ex : Point mensuel, suivi projet..."
            />
          </div>
        </div>
      )}

      {/* Bouton générer */}
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full"
        size="sm"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération en cours...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" />Générer</>
        )}
      </Button>

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Résultat */}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Résultat
            </p>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2">
              {copied ? (
                <><Check className="w-3 h-3 mr-1 text-green-600" /><span className="text-xs text-green-600">Copié</span></>
              ) : (
                <><Copy className="w-3 h-3 mr-1" /><span className="text-xs">Copier</span></>
              )}
            </Button>
          </div>
          <Textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={10}
            className="text-sm font-mono leading-relaxed resize-none bg-gray-50"
          />
          <p className="text-xs text-gray-400">
            Vous pouvez modifier le texte avant de l'utiliser.
          </p>
        </div>
      )}
    </div>
  );
}
