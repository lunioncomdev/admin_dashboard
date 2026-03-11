import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  let config = await prisma.aiConfig.findFirst();
  if (!config) {
    config = await prisma.aiConfig.create({
      data: { isEnabled: true, modelName: "gpt-4o-mini", monthlyBudget: 50, currentSpend: 0 },
    });
  }

  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });

  const body = await req.json();

  let config = await prisma.aiConfig.findFirst();
  if (!config) {
    config = await prisma.aiConfig.create({
      data: { isEnabled: true, modelName: "gpt-4o-mini", monthlyBudget: 50, currentSpend: 0 },
    });
  }

  const updated = await prisma.aiConfig.update({
    where: { id: config.id },
    data: {
      isEnabled: body.isEnabled ?? config.isEnabled,
      modelName: body.modelName ?? config.modelName,
      monthlyBudget: body.monthlyBudget !== undefined ? parseFloat(body.monthlyBudget) : config.monthlyBudget,
      resetDay: body.resetDay ?? config.resetDay,
      updatedBy: session.user.id,
    },
  });

  return NextResponse.json(updated);
}
