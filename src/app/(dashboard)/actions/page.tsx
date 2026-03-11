import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ActionsList } from "./_components/actions-list";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    client_id?: string;
    project_id?: string;
    assigned_to?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ActionsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (sp.status) where.status = sp.status;
  if (sp.priority) where.priority = sp.priority;
  if (sp.client_id) where.clientId = sp.client_id;
  if (sp.project_id) where.projectId = sp.project_id;
  if (sp.assigned_to) where.assignedTo = sp.assigned_to;
  if (sp.search) where.title = { contains: sp.search, mode: "insensitive" };

  const [actions, total, clients, projects, users] = await Promise.all([
    prisma.action.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      include: {
        client: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.action.count({ where }),
    prisma.client.findMany({
      where: { status: { not: "inactif" } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
    prisma.project.findMany({
      where: { status: { not: "annule" } },
      select: { id: true, name: true, clientId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <ActionsList
      actions={actions.map((a) => ({
        ...a,
        assignedTo: a.assignee.id,
        _count: { comments: a._count.comments },
      }))}
      total={total}
      clients={clients}
      projects={projects}
      users={users}
      currentUserRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
