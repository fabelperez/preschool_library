import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId } = body;

    if (!checkoutId) {
      return NextResponse.json({ error: "Checkout ID is required" }, { status: 400 });
    }

    const checkout = await prisma.resourceCheckout.update({
      where: { id: checkoutId },
      data: { returnedAt: new Date() },
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

    return NextResponse.json(checkout);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to return resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
