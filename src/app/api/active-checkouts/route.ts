import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const BOOK_DUE_DAYS = 14;
  const RESOURCE_DUE_DAYS = 7;

  function computeDueDate(checkedOutAt: Date, type: string): string {
    const due = new Date(checkedOutAt);
    due.setDate(due.getDate() + (type === "BOOK" ? BOOK_DUE_DAYS : RESOURCE_DUE_DAYS));
    return due.toISOString();
  }

  const [bookThemeCheckouts, resourceCheckouts] = await Promise.all([
    prisma.checkout.findMany({
      where: { returnedAt: null },
      include: {
        book: {
          select: {
            title: true,
            author: true,
            isbn: true,
            totalCopies: true,
            checkouts: { where: { returnedAt: null }, select: { id: true } },
          },
        },
        resourceCategory: { select: { name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { checkedOutAt: "desc" },
    }),
    prisma.resourceCheckout.findMany({
      where: { returnedAt: null },
      include: {
        resource: {
          select: {
            name: true,
            quantity: true,
            resourceCategory: { select: { name: true } },
            bin: {
              select: {
                number: true,
                label: true,
                shelf: { select: { name: true } },
              },
            },
            checkouts: { where: { returnedAt: null }, select: { id: true } },
          },
        },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { checkedOutAt: "desc" },
    }),
  ]);

  const unified = [
    ...bookThemeCheckouts.map((co) => ({
      id: co.id,
      type: co.type === "THEME" ? ("theme" as const) : ("book" as const),
      itemName:
        co.type === "THEME"
          ? (co.resourceCategory?.name ?? "Unknown Theme")
          : (co.book?.title ?? "Unknown Book"),
      itemDetail:
        co.type === "THEME"
          ? "Teacher Resource Theme"
          : (co.book?.author ?? ""),
      isbn: co.book?.isbn ?? null,
      teacherId: co.teacherId,
      teacherName: co.teacher.name,
      checkedOutAt: co.checkedOutAt.toISOString(),
      dueDate: computeDueDate(co.checkedOutAt, co.type),
      availability: co.book
        ? {
            available: co.book.totalCopies - co.book.checkouts.length,
            total: co.book.totalCopies,
          }
        : null,
    })),
    ...resourceCheckouts.map((co) => ({
      id: co.id,
      type: "resource" as const,
      itemName: co.resource.name,
      itemDetail: `${co.resource.bin.shelf.name} → ${co.resource.bin.label || `Bin ${co.resource.bin.number}`} · ${co.resource.resourceCategory.name}`,
      isbn: null,
      teacherId: co.teacherId,
      teacherName: co.teacher.name,
      checkedOutAt: co.checkedOutAt.toISOString(),
      dueDate: computeDueDate(co.checkedOutAt, "RESOURCE"),
      availability: {
        available: co.resource.quantity - co.resource.checkouts.length,
        total: co.resource.quantity,
      },
    })),
  ].sort(
    (a, b) =>
      new Date(b.checkedOutAt).getTime() - new Date(a.checkedOutAt).getTime()
  );

  return NextResponse.json(unified);
}
