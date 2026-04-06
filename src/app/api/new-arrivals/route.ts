import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAYS = 30;
const LIMIT = 6;

export async function GET() {
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const books = await prisma.book.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    select: {
      id: true,
      title: true,
      author: true,
      coverImageUrl: true,
      createdAt: true,
      category: { select: { name: true } },
    },
  });

  return NextResponse.json(books);
}
