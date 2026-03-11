import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProjectsList } from "./_components/projects-list";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    client_id?: string;
    owner_id?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (sp.status) where.status = sp.status;
  if (sp.client_id) where.clientId = sp.client_id;
  if (sp.owner_id) where.ownerId = sp.owner_id;
  if (sp.search) where.name = { contains: sp.search, mode: "insensitive" };

  const [projects, total, clients, users] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, companyName: true } },
        owner: { select: { id: true, fullName: true } },
        _count: { select: { actions: true, milestones: true } },
      },
    }),
    prisma.project.count({ where }),
    prisma.client.findMany({
      where: { status: { not: "inactif" } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <ProjectsList
      projects={projects.map((p) => ({
        ...p,
        budget: p.budget !== null ? Number(p.budget) : null,
      }))}
      total={total}
      clients={clients}
      users={users}
      currentUserRole={session.user.role}
    />
  );
}
