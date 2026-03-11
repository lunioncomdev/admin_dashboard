import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("changeme", 12);

  // Créer les 4 utilisateurs de l'équipe
  const alex = await prisma.user.upsert({
    where: { email: "alex@company.com" },
    update: {},
    create: {
      fullName: "Alex",
      email: "alex@company.com",
      passwordHash,
      role: "admin",
    },
  });

  const riadh = await prisma.user.upsert({
    where: { email: "riadh@company.com" },
    update: {},
    create: {
      fullName: "Riadh",
      email: "riadh@company.com",
      passwordHash,
      role: "admin",
    },
  });

  const capu = await prisma.user.upsert({
    where: { email: "capu@company.com" },
    update: {},
    create: {
      fullName: "Capu",
      email: "capu@company.com",
      passwordHash,
      role: "user",
    },
  });

  const francois = await prisma.user.upsert({
    where: { email: "francois@company.com" },
    update: {},
    create: {
      fullName: "François",
      email: "francois@company.com",
      passwordHash,
      role: "user",
    },
  });

  // Créer les préférences de notification pour chaque utilisateur
  for (const user of [alex, riadh, capu, francois]) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  // Créer la config IA par défaut
  const aiConfigCount = await prisma.aiConfig.count();
  if (aiConfigCount === 0) {
    await prisma.aiConfig.create({
      data: {
        isEnabled: true,
        modelName: "gpt-4o",
        monthlyBudget: 50.0,
        currentSpend: 0.0,
        updatedBy: alex.id,
      },
    });
  }

  // Données de démonstration : 2 clients
  const clientAccme = await prisma.client.upsert({
    where: { id: "demo-client-acme" },
    update: {},
    create: {
      id: "demo-client-acme",
      companyName: "Acme Corp",
      sector: "Technologie",
      status: "actif",
      csmId: capu.id,
      notes: "Client historique, très satisfait",
    },
  });

  const clientBeta = await prisma.client.upsert({
    where: { id: "demo-client-beta" },
    update: {},
    create: {
      id: "demo-client-beta",
      companyName: "Beta Solutions",
      sector: "Conseil",
      status: "prospect",
      csmId: francois.id,
    },
  });

  // Contacts pour Acme Corp
  await prisma.contact.upsert({
    where: {
      id: "demo-contact-1",
    },
    update: {},
    create: {
      id: "demo-contact-1",
      clientId: clientAccme.id,
      fullName: "Marie Dupont",
      jobTitle: "Directrice IT",
      email: "marie.dupont@acme.com",
      phone: "+33 6 12 34 56 78",
      isPrimary: true,
    },
  });

  // Projet de démonstration
  const project = await prisma.project.upsert({
    where: { id: "demo-project-1" },
    update: {},
    create: {
      id: "demo-project-1",
      name: "Intégration ERP",
      description: "Migration et intégration du système ERP",
      clientId: clientAccme.id,
      status: "en_cours",
      ownerId: capu.id,
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-06-30"),
    },
  });

  // Actions de démonstration
  await prisma.action.upsert({
    where: { id: "demo-action-1" },
    update: {},
    create: {
      id: "demo-action-1",
      title: "Réunion de suivi mensuelle",
      description: "Point mensuel avec Marie Dupont",
      clientId: clientAccme.id,
      projectId: project.id,
      assignedTo: capu.id,
      createdBy: capu.id,
      priority: "haute",
      status: "a_faire",
      dueDate: new Date("2025-02-28"),
    },
  });

  await prisma.action.upsert({
    where: { id: "demo-action-2" },
    update: {},
    create: {
      id: "demo-action-2",
      title: "Livraison documentation technique",
      clientId: clientAccme.id,
      projectId: project.id,
      assignedTo: capu.id,
      createdBy: riadh.id,
      priority: "moyenne",
      status: "en_cours",
      dueDate: new Date("2025-03-15"),
    },
  });

  console.log("✅ Seed terminé !");
  console.log("\n👥 Utilisateurs créés :");
  console.log("  admin  → alex@company.com     / changeme");
  console.log("  admin  → riadh@company.com    / changeme");
  console.log("  user   → capu@company.com     / changeme");
  console.log("  user   → francois@company.com / changeme");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
