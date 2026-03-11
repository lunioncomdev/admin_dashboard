import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export type AiRequest =
  | { type: "client_summary"; clientId: string }
  | { type: "action_suggestion"; clientId: string; projectId?: string }
  | { type: "draft_email"; clientId: string; contactName: string; subject: string }
  | { type: "health_analysis"; clientId: string }
  | { type: "priority_ranking"; actionIds: string[] };

export type AiResult = {
  content: string;
  tokensUsed: number;
  model: string;
};

async function getAiConfig() {
  let config = await prisma.aiConfig.findFirst();
  if (!config) {
    config = await prisma.aiConfig.create({
      data: { isEnabled: true, modelName: "gpt-4o-mini", monthlyBudget: 50, currentSpend: 0 },
    });
  }
  return config;
}

export async function runAiRequest(req: AiRequest, userId: string): Promise<AiResult> {
  const config = await getAiConfig();
  if (!config.isEnabled) throw new Error("L'IA est désactivée par l'administrateur");

  const model = config.modelName;
  let prompt = "";
  let contextData: Record<string, unknown> = {};

  switch (req.type) {
    case "client_summary": {
      const client = await prisma.client.findUnique({
        where: { id: req.clientId },
        include: {
          csm: { select: { fullName: true } },
          contacts: { where: { isPrimary: true }, take: 1 },
          projects: { take: 5, orderBy: { createdAt: "desc" }, select: { name: true, status: true } },
          actions: {
            where: { status: { not: "termine" } },
            take: 10,
            orderBy: { dueDate: "asc" },
            select: { title: true, priority: true, status: true, dueDate: true },
          },
          activityLogs: { take: 5, orderBy: { createdAt: "desc" }, select: { description: true, createdAt: true } },
        },
      });
      if (!client) throw new Error("Client introuvable");

      contextData = { client };
      const overdueActions = client.actions.filter((a) => new Date(a.dueDate) < new Date());

      prompt = `Tu es un assistant pour une équipe de Customer Success Management.
Génère un résumé exécutif concis (5-8 phrases) du client "${client.companyName}" basé sur ces données :
- Secteur : ${client.sector ?? "non renseigné"}
- Statut : ${client.status}
- CSM : ${client.csm?.fullName ?? "non assigné"}
- Contact principal : ${client.contacts[0]?.fullName ?? "aucun"}
- Projets en cours : ${client.projects.filter((p) => p.status === "en_cours").map((p) => p.name).join(", ") || "aucun"}
- Actions en retard : ${overdueActions.length} (sur ${client.actions.length} ouvertes)
- Dernières activités : ${client.activityLogs.map((l) => l.description).join("; ")}

Le résumé doit inclure : état général de la relation, risques identifiés, prochaines étapes recommandées. Réponds en français.`;
      break;
    }

    case "action_suggestion": {
      const client = await prisma.client.findUnique({
        where: { id: req.clientId },
        include: {
          projects: {
            where: req.projectId ? { id: req.projectId } : { status: "en_cours" },
            take: 3,
            include: {
              actions: {
                where: { status: { not: "termine" } },
                take: 10,
                select: { title: true, priority: true, status: true, dueDate: true },
              },
              milestones: { where: { completed: false }, take: 5, select: { name: true, targetDate: true } },
            },
          },
          activityLogs: { take: 5, orderBy: { createdAt: "desc" }, select: { description: true } },
        },
      });
      if (!client) throw new Error("Client introuvable");

      contextData = { clientId: req.clientId, projectId: req.projectId };
      const overdueActions = client.projects.flatMap((p) =>
        p.actions.filter((a) => new Date(a.dueDate) < new Date())
      );

      prompt = `Tu es un assistant pour une équipe de Customer Success Management.
Propose 3 à 5 actions concrètes à créer pour le client "${client.companyName}" basé sur :
- Projets actifs : ${client.projects.map((p) => p.name).join(", ")}
- Actions en retard : ${overdueActions.length}
- Jalons à venir : ${client.projects.flatMap((p) => p.milestones).map((m) => m.name).join(", ") || "aucun"}
- Récent : ${client.activityLogs.map((l) => l.description).join("; ")}

Pour chaque action proposée, indique :
1. Titre de l'action
2. Priorité (basse/moyenne/haute/urgente)
3. Délai recommandé (en jours)
4. Raison/justification

Format : liste numérotée, réponse concise en français.`;
      break;
    }

    case "draft_email": {
      const client = await prisma.client.findUnique({
        where: { id: req.clientId },
        include: {
          csm: { select: { fullName: true } },
          projects: { where: { status: "en_cours" }, take: 3, select: { name: true } },
          actions: {
            where: { status: { not: "termine" }, dueDate: { lt: new Date(Date.now() + 7 * 86400000) } },
            take: 5,
            select: { title: true, dueDate: true },
          },
        },
      });
      if (!client) throw new Error("Client introuvable");

      contextData = { clientId: req.clientId, contactName: req.contactName };

      prompt = `Tu es un Customer Success Manager. Rédige un email professionnel en français pour :
- Destinataire : ${req.contactName} chez ${client.companyName}
- Expéditeur : ${client.csm?.fullName ?? "l'équipe CSM"}
- Objet : ${req.subject}
- Projets en cours : ${client.projects.map((p) => p.name).join(", ") || "aucun"}
- Actions à venir (7 jours) : ${client.actions.map((a) => `${a.title} (${new Date(a.dueDate).toLocaleDateString("fr-FR")})`).join(", ") || "aucune"}

L'email doit être professionnel, chaleureux et orienté client. Inclus une formule d'accroche, le corps du message et une formule de clôture.`;
      break;
    }

    case "health_analysis": {
      const client = await prisma.client.findUnique({
        where: { id: req.clientId },
        include: {
          projects: {
            select: { name: true, status: true },
            take: 10,
          },
          actions: {
            where: { status: { not: "termine" } },
            select: { priority: true, status: true, dueDate: true },
            take: 50,
          },
          activityLogs: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: { description: true, createdAt: true },
          },
        },
      });
      if (!client) throw new Error("Client introuvable");

      contextData = { clientId: req.clientId };
      const overdueCount = client.actions.filter((a) => new Date(a.dueDate) < new Date()).length;
      const urgentCount = client.actions.filter((a) => a.priority === "urgente").length;
      const blockedCount = client.actions.filter((a) => a.status === "bloque").length;

      prompt = `Analyse la santé de la relation client avec "${client.companyName}" (statut: ${client.status}).

Données :
- Projets : ${client.projects.length} (${client.projects.filter((p) => p.status === "en_cours").length} en cours, ${client.projects.filter((p) => p.status === "annule").length} annulés)
- Actions ouvertes : ${client.actions.length} (${overdueCount} en retard, ${urgentCount} urgentes, ${blockedCount} bloquées)
- Dernière activité : ${client.activityLogs[0]?.description ?? "aucune"}

Fournis une analyse en 3 parties :
1. **Score de santé** : 1-10 avec justification
2. **Risques** : 2-3 risques identifiés
3. **Recommandations** : 2-3 actions prioritaires

Réponds en français de façon concise et structurée.`;
      break;
    }

    case "priority_ranking": {
      const actions = await prisma.action.findMany({
        where: { id: { in: req.actionIds } },
        select: {
          id: true, title: true, priority: true, status: true, dueDate: true,
          client: { select: { companyName: true, status: true } },
        },
      });

      contextData = { actionIds: req.actionIds };

      prompt = `Tu es un assistant de Customer Success. Classe ces ${actions.length} actions par ordre de priorité absolue.

Actions :
${actions.map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] "${a.title}" - Client: ${a.client.companyName} (${a.client.status}) - Échéance: ${new Date(a.dueDate).toLocaleDateString("fr-FR")}`).join("\n")}

Réponds avec :
1. La liste classée par priorité (du plus urgent au moins urgent)
2. Pour chaque action : une phrase de justification

Réponds en français.`;
      break;
    }
  }

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content ?? "";
  const tokensUsed = response.usage?.total_tokens ?? 0;

  // Enregistrer la suggestion en base
  await prisma.aiSuggestion.create({
    data: {
      type: req.type === "client_summary" ? "client_summary"
        : req.type === "action_suggestion" ? "action_suggestion"
        : req.type === "draft_email" ? "draft_email"
        : req.type === "health_analysis" ? "anomaly_alert"
        : "priority_ranking",
      content,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contextData: contextData as any,
      modelUsed: model,
      tokensUsed,
      clientId: "clientId" in req ? req.clientId : null,
      requestedBy: userId,
    },
  });

  // Mettre à jour les dépenses (approximatif — coût non calculé exactement)
  await prisma.aiConfig.updateMany({
    data: { currentSpend: { increment: 0.001 } }, // estimation symbolique
  });

  return { content, tokensUsed, model };
}
