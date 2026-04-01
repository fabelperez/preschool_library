import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const [bookHistory, resourceHistory] = await Promise.all([
    prisma.checkout.findMany({
      where: { teacherId: id, returnedAt: { not: null } },
      include: {
        book: { select: { title: true, author: true } },
        resourceCategory: { select: { name: true } },
      },
      orderBy: { returnedAt: "desc" },
      take: 50,
    }),
    prisma.resourceCheckout.findMany({
      where: { teacherId: id, returnedAt: { not: null } },
      include: {
        resource: {
          select: {
            name: true,
            resourceCategory: { select: { name: true } },
          },
        },
      },
      orderBy: { returnedAt: "desc" },
      take: 50,
    }),
  ]);

  const history = [
    ...bookHistory.map((co) => ({
      id: co.id,
      type: co.type === "THEME" ? "theme" : "book",
      itemName:
        co.type === "THEME"
          ? (co.resourceCategory?.name ?? "Theme")
          : (co.book?.title ?? "Book"),
      itemDetail:
        co.type === "THEME" ? "Theme" : (co.book?.author ?? ""),
      checkedOutAt: co.checkedOutAt.toISOString(),
      returnedAt: co.returnedAt!.toISOString(),
    })),
    ...resourceHistory.map((co) => ({
      id: co.id,
      type: "resource",
      itemName: co.resource.name,
      itemDetail: co.resource.resourceCategory.name,
      checkedOutAt: co.checkedOutAt.toISOString(),
      returnedAt: co.returnedAt!.toISOString(),
    })),
  ].sort(
    (a, b) =>
      new Date(b.returnedAt).getTime() - new Date(a.returnedAt).getTime()
  );

  return NextResponse.json(history);
}
