import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCheckedOutThemeIds } from "@/lib/checkout-rules";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const resource = await prisma.resource.findUnique({
    where: { id: params.id },
    include: {
      resourceCategory: true,
      bin: {
        include: {
          shelf: { select: { id: true, name: true, type: true } },
        },
      },
      checkouts: {
        include: { teacher: true },
        orderBy: { checkedOutAt: "desc" },
      },
    },
  });

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const activeCheckouts = resource.checkouts.filter((c) => !c.returnedAt);
  const checkedOutThemes = await getCheckedOutThemeIds();
  const themeCheckedOut = resource.resourceCategoryId
    ? checkedOutThemes.has(resource.resourceCategoryId)
    : false;

  return NextResponse.json({
    ...resource,
    themeCheckedOut,
    availableQuantity: themeCheckedOut ? 0 : resource.quantity - activeCheckouts.length,
    checkedOutBy: activeCheckouts.map((c) => ({
      teacherName: c.teacher.name,
      checkedOutAt: c.checkedOutAt,
    })),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, quantity, resourceCategoryId, binId } = body;

    const resource = await prisma.resource.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(quantity !== undefined && { quantity }),
        ...(resourceCategoryId !== undefined && { resourceCategoryId }),
        ...(binId !== undefined && { binId }),
      },
      include: {
        resourceCategory: true,
        bin: { include: { shelf: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(resource);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.resource.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, statusNote } = body;
    if (!["available", "lost", "damaged"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const resource = await prisma.resource.update({
      where: { id: params.id },
      data: { status, statusNote: statusNote ?? null, statusUpdatedAt: new Date() },
    });
    return NextResponse.json(resource);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update resource status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
