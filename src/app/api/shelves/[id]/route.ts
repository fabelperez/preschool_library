import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const shelf = await prisma.shelf.findUnique({
    where: { id: params.id },
    include: {
      sections: {
        include: {
          category: {
            include: {
              books: {
                include: {
                  checkouts: {
                    where: { returnedAt: null },
                    include: { teacher: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
      bins: {
        include: {
          resources: {
            include: {
              resourceCategory: true,
              checkouts: { where: { returnedAt: null } },
            },
          },
          books: {
            include: {
              category: true,
              qualifier: true,
              checkouts: { where: { returnedAt: null } },
              resource: {
                include: { resourceCategory: true },
              },
              resourceCategory: true,
            },
          },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  return NextResponse.json(shelf);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, position, type, sections } = body;

    // Update shelf basic info + layout fields
    const shelf = await prisma.shelf.update({
      where: { id: params.id },
      data: {
        name,
        position,
        ...(type !== undefined && { type }),
        ...(body.layoutX !== undefined && { layoutX: body.layoutX }),
        ...(body.layoutY !== undefined && { layoutY: body.layoutY }),
        ...(body.layoutWidth !== undefined && { layoutWidth: body.layoutWidth }),
        ...(body.layoutHeight !== undefined && { layoutHeight: body.layoutHeight }),
        ...(body.layoutRotation !== undefined && { layoutRotation: body.layoutRotation }),
      },
    });

    // If sections provided, replace them
    if (sections) {
      await prisma.shelfSection.deleteMany({ where: { shelfId: params.id } });
      await prisma.shelfSection.createMany({
        data: sections.map((s: { categoryId: string; label?: string; position?: number }) => ({
          shelfId: params.id,
          categoryId: s.categoryId,
          label: s.label || null,
          position: s.position || 0,
        })),
      });
    }

    const updated = await prisma.shelf.findUnique({
      where: { id: shelf.id },
      include: { sections: { include: { category: true } } },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update shelf";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.shelf.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete shelf";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
