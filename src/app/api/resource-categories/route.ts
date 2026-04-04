import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.resourceCategory.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { resources: true, books: true } },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const category = await prisma.resourceCategory.create({
      data: { name, description: description || null },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create resource category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
