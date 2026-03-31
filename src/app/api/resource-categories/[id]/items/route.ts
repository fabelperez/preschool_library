import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const [resources, books] = await Promise.all([
    prisma.resource.findMany({
      where: { resourceCategoryId: id },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.book.findMany({
      where: { resourceCategoryId: id },
      select: { title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return NextResponse.json({
    resources: resources.map((r) => r.name),
    books: books.map((b) => b.title),
  });
}
