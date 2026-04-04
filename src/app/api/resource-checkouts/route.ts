import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checkouts = await prisma.resourceCheckout.findMany({
    where: { returnedAt: null },
    include: {
      resource: {
        include: {
          resourceCategory: true,
          bin: { include: { shelf: { select: { id: true, name: true } } } },
        },
      },
      teacher: true,
    },
    orderBy: { checkedOutAt: "desc" },
  });

  return NextResponse.json(checkouts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resourceId, teacherId } = body;

    if (!resourceId || !teacherId) {
      return NextResponse.json(
        { error: "Resource ID and Teacher ID are required" },
        { status: 400 }
      );
    }

    // Check availability
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { checkouts: { where: { returnedAt: null } } },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    if (resource.status === "lost") {
      return NextResponse.json({ error: "This resource is marked as lost and cannot be checked out" }, { status: 400 });
    }
    if (resource.status === "damaged") {
      return NextResponse.json({ error: "This resource is marked as damaged and cannot be checked out" }, { status: 400 });
    }

    const available = resource.quantity - resource.checkouts.length;
    if (available <= 0) {
      return NextResponse.json({ error: "No units available" }, { status: 400 });
    }

    const checkout = await prisma.resourceCheckout.create({
      data: { resourceId, teacherId },
      include: {
        resource: {
          include: {
            resourceCategory: true,
            bin: { include: { shelf: { select: { id: true, name: true } } } },
          },
        },
        teacher: true,
      },
    });

    return NextResponse.json(checkout, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to check out resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
