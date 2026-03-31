import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bin = await prisma.bin.findUnique({
    where: { id: params.id },
    include: {
      shelf: { select: { id: true, name: true, type: true } },
      resources: {
        include: {
          resourceCategory: true,
          checkouts: { where: { returnedAt: null }, include: { teacher: true } },
        },
      },
      books: {
        include: {
          category: true,
          qualifier: true,
          checkouts: { where: { returnedAt: null }, include: { teacher: true } },
        },
      },
    },
  });

  if (!bin) {
    return NextResponse.json({ error: "Bin not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...bin,
    resources: bin.resources.map((r) => ({
      ...r,
      availableQuantity: r.quantity - r.checkouts.length,
      checkedOutBy: r.checkouts.map((c) => ({
        teacherName: c.teacher.name,
        checkedOutAt: c.checkedOutAt,
      })),
    })),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { number, label, theme } = body;

    const bin = await prisma.bin.update({
      where: { id: params.id },
      data: {
        ...(number !== undefined && { number }),
        ...(label !== undefined && { label }),
        ...(theme !== undefined && { theme }),
      },
      include: { shelf: { select: { id: true, name: true } } },
    });

    return NextResponse.json(bin);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update bin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.bin.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete bin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
