import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const shelves = await prisma.shelf.findMany({
    include: {
      sections: {
        include: {
          category: {
            include: {
              books: {
                include: {
                  checkouts: { where: { returnedAt: null } },
                },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
  });

  const shelvesWithCounts = shelves.map((shelf) => ({
    ...shelf,
    sections: shelf.sections.map((section) => ({
      ...section,
      bookCount: section.category.books.length,
      availableCount: section.category.books.filter(
        (b) => b.totalCopies - b.checkouts.length > 0
      ).length,
    })),
  }));

  return NextResponse.json(shelvesWithCounts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, position, sections } = body;

    const shelf = await prisma.shelf.create({
      data: {
        name,
        position: position || 0,
        sections: sections ? {
          create: sections.map((s: { categoryId: string; label?: string; position?: number }) => ({
            categoryId: s.categoryId,
            label: s.label || null,
            position: s.position || 0,
          })),
        } : undefined,
      },
      include: { sections: { include: { category: true } } },
    });

    return NextResponse.json(shelf, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create shelf";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
