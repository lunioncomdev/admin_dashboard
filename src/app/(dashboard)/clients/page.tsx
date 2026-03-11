import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type SessionUser } from "@/types";
import { ClientsList } from "./_components/clients-list";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const isAdmin = user.role === "admin";
  const params = await searchParams;

  const status = params.status as "prospect" | "actif" | "inactif" | undefined;
  const search = params.search;
  const page = parseInt(params.page ?? "1");
  const limit = 20;

  const where = {
    ...(status ? { status } : {}),
    ...(isAdmin ? {} : { csmId: user.id }),
    ...(search ? { companyName: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [clients, total, users] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        csm: { select: { fullName: true } },
        contacts: {
          where: { isPrimary: true },
          select: { fullName: true, email: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
    prisma.user.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <ClientsList
      clients={clients}
      users={users}
      currentUserRole={user.role}
      total={total}
    />
  );
}
