import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const count = await prisma.bookSubmission.count({
    where: { status: "pending" },
  });

  return NextResponse.json({ count });
}
