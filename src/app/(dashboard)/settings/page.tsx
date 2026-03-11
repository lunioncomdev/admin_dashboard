import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./_components/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "admin";

  const users = isAdmin
    ? await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { assignedActions: true, ownedProjects: true } },
        },
        orderBy: { fullName: "asc" },
      })
    : [];

  return (
    <SettingsClient
      currentUser={{
        id: session.user.id,
        fullName: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      isAdmin={isAdmin}
    />
  );
}
