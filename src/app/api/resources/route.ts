import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const binId = searchParams.get("binId") || "";
  const resourceCategoryId = searchParams.get("resourceCategoryId") || "";

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { description: { contains: query } },
    ];
  }
  if (binId) where.binId = binId;
  if (resourceCategoryId) where.resourceCategoryId = resourceCategoryId;

  const resources = await prisma.resource.findMany({
    where,
    include: {
      resourceCategory: true,
      bin: {
        include: {
          shelf: { select: { id: true, name: true } },
        },
      },
      checkouts: {
        where: { returnedAt: null },
        include: { teacher: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const resourcesWithAvailability = resources.map((r) => ({
    ...r,
    availableQuantity: r.quantity - r.checkouts.length,
    checkedOutBy: r.checkouts.map((c) => ({
      teacherName: c.teacher.name,
      checkedOutAt: c.checkedOutAt,
    })),
  }));

  return NextResponse.json(resourcesWithAvailability);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, quantity, resourceCategoryId, binId } = body;

    if (!name || !resourceCategoryId || !binId) {
      return NextResponse.json(
        { error: "Name, resource category, and bin are required" },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.create({
      data: {
        name,
        description: description || null,
        quantity: quantity || 1,
        resourceCategoryId,
        binId,
      },
      include: {
        resourceCategory: true,
        bin: { include: { shelf: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
