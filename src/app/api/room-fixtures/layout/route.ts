import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { fixtures } = body as {
      fixtures: {
        id: string;
        layoutX: number;
        layoutY: number;
        layoutWidth: number;
        layoutHeight: number;
        layoutRotation: number;
      }[];
    };

    if (!Array.isArray(fixtures)) {
      return NextResponse.json({ error: "fixtures array is required" }, { status: 400 });
    }

    await prisma.$transaction(
      fixtures.map((f) =>
        prisma.roomFixture.update({
          where: { id: f.id },
          data: {
            layoutX: f.layoutX,
            layoutY: f.layoutY,
            layoutWidth: f.layoutWidth,
            layoutHeight: f.layoutHeight,
            layoutRotation: f.layoutRotation,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update fixture layout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
