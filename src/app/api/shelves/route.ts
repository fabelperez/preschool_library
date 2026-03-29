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
      bins: {
        include: {
          _count: { select: { resources: true, books: true } },
          resources: {
            select: {
              quantity: true,
              checkouts: { where: { returnedAt: null }, select: { id: true } },
            },
          },
        },
        orderBy: { number: "asc" },
      },
    },
    orderBy: { position: "asc" },
  });

  const shelvesWithCounts = shelves.map((shelf) => {
    const totalResourceQuantity = shelf.bins.reduce(
      (sum, bin) => sum + bin.resources.reduce((s, r) => s + r.quantity, 0), 0
    );
    const checkedOutResourceCount = shelf.bins.reduce(
      (sum, bin) => sum + bin.resources.reduce((s, r) => s + r.checkouts.length, 0), 0
    );

    return {
      ...shelf,
      sections: shelf.sections.map((section) => ({
        ...section,
        bookCount: section.category.books.length,
        availableCount: section.category.books.filter(
          (b) => b.totalCopies - b.checkouts.length > 0
        ).length,
      })),
      bins: shelf.bins.map((bin) => ({
        id: bin.id,
        number: bin.number,
        label: bin.label,
        _count: bin._count,
      })),
      resourceCount: totalResourceQuantity,
      availableResourceCount: totalResourceQuantity - checkedOutResourceCount,
    };
  });

  return NextResponse.json(shelvesWithCounts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, position, sections, type } = body;

    const shelf = await prisma.shelf.create({
      data: {
        name,
        type: type || "book",
        position: position || 0,
        layoutX: body.layoutX ?? 5,
        layoutY: body.layoutY ?? 5,
        layoutWidth: body.layoutWidth ?? 25,
        layoutHeight: body.layoutHeight ?? 14,
        layoutRotation: body.layoutRotation ?? 0,
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
