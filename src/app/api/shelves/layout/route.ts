import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { shelves } = body as {
      shelves: {
        id: string;
        layoutX: number;
        layoutY: number;
        layoutWidth: number;
        layoutHeight: number;
        layoutRotation: number;
      }[];
    };

    if (!Array.isArray(shelves)) {
      return NextResponse.json({ error: "shelves array is required" }, { status: 400 });
    }

    await prisma.$transaction(
      shelves.map((s) =>
        prisma.shelf.update({
          where: { id: s.id },
          data: {
            layoutX: s.layoutX,
            layoutY: s.layoutY,
            layoutWidth: s.layoutWidth,
            layoutHeight: s.layoutHeight,
            layoutRotation: s.layoutRotation,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update layout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
