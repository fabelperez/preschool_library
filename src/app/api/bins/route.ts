import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const shelfId = request.nextUrl.searchParams.get("shelfId") || "";

  const where: Record<string, unknown> = {};
  if (shelfId) where.shelfId = shelfId;

  const bins = await prisma.bin.findMany({
    where,
    include: {
      shelf: { select: { id: true, name: true } },
      resources: {
        include: {
          resourceCategory: true,
          checkouts: { where: { returnedAt: null }, include: { teacher: true } },
        },
      },
      _count: { select: { resources: true, books: true } },
    },
    orderBy: [{ shelf: { position: "asc" } }, { number: "asc" }],
  });

  const binsWithAvailability = bins.map((bin) => ({
    ...bin,
    resources: bin.resources.map((r) => ({
      ...r,
      availableQuantity: r.quantity - r.checkouts.length,
      checkedOutBy: r.checkouts.map((c) => ({
        teacherName: c.teacher.name,
        checkedOutAt: c.checkedOutAt,
      })),
    })),
  }));

  return NextResponse.json(binsWithAvailability);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number, label, shelfId } = body;

    if (!number || !shelfId) {
      return NextResponse.json({ error: "Bin number and shelf ID are required" }, { status: 400 });
    }

    const bin = await prisma.bin.create({
      data: { number, label: label || `Bin ${number}`, shelfId },
      include: { shelf: { select: { id: true, name: true } } },
    });

    return NextResponse.json(bin, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create bin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
