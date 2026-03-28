import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const fixtures = await prisma.roomFixture.findMany({
    orderBy: { position: "asc" },
  });
  return NextResponse.json(fixtures);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fixture = await prisma.roomFixture.create({
      data: {
        type: body.type || "custom",
        label: body.label || "New Item",
        emoji: body.emoji || "📦",
        layoutX: body.layoutX ?? 10,
        layoutY: body.layoutY ?? 10,
        layoutWidth: body.layoutWidth ?? 15,
        layoutHeight: body.layoutHeight ?? 15,
        layoutRotation: body.layoutRotation ?? 0,
        borderStyle: body.borderStyle || "solid",
        bgColor: body.bgColor || "bg-gray-100/50",
        position: body.position ?? 0,
      },
    });
    return NextResponse.json(fixture, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create fixture";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.roomFixture.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete fixture";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
