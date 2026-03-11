import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type SessionUser } from "@/types";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ClientDetailClient } from "./_components/client-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const { id } = await params;

  const [client, users] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        csm: { select: { id: true, fullName: true } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        projects: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            owner: { select: { fullName: true } },
            _count: { select: { actions: true } },
          },
        },
        actions: {
          where: { status: { in: ["a_faire", "en_cours"] } },
          orderBy: { dueDate: "asc" },
          take: 5,
          include: { assignee: { select: { fullName: true } } },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { fullName: true } } },
        },
      },
    }),
    prisma.user.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  if (!client) notFound();

  const projectStatusLabels: Record<string, string> = {
    nouveau: "Nouveau", en_cours: "En cours", en_pause: "En pause",
    termine: "Terminé", annule: "Annulé",
  };

  const projectStatusColors: Record<string, string> = {
    nouveau: "bg-gray-100 text-gray-600",
    en_cours: "bg-blue-100 text-blue-700",
    en_pause: "bg-yellow-100 text-yellow-700",
    termine: "bg-green-100 text-green-700",
    annule: "bg-red-100 text-red-600",
  };

  const priorityColors: Record<string, string> = {
    basse: "bg-blue-100 text-blue-700",
    moyenne: "bg-yellow-100 text-yellow-700",
    haute: "bg-orange-100 text-orange-700",
    urgente: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-gray-700">Clients</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{client.companyName}</span>
      </div>

      <ClientDetailClient
        client={client}
        users={users}
        currentUserId={user.id}
        currentUserRole={user.role}
        projectStatusLabels={projectStatusLabels}
        projectStatusColors={projectStatusColors}
        priorityColors={priorityColors}
      />
    </div>
  );
}
