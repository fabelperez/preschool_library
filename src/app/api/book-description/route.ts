import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function fetchDescriptionFromOpenLibrary(isbn: string): Promise<string | null> {
  const normalized = isbn.replace(/[\s-]/g, "");

  // Step 1: edition record (contains pointer to work)
  const editionRes = await fetch(`https://openlibrary.org/isbn/${normalized}.json`, {
    headers: { "User-Agent": "preschool-library/1.0" },
  });
  if (!editionRes.ok) return null;
  const edition = await editionRes.json();

  // Step 2: resolve work key
  const workKey: string | undefined = edition.works?.[0]?.key;
  if (!workKey) return null;

  // Step 3: work record (may contain description)
  const workRes = await fetch(`https://openlibrary.org${workKey}.json`, {
    headers: { "User-Agent": "preschool-library/1.0" },
  });
  if (!workRes.ok) return null;
  const work = await workRes.json();

  // Step 4: description may be a plain string or { type, value }
  const raw = work.description;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && typeof raw.value === "string") return raw.value;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, bookId } = body as { isbn?: string; bookId?: string };

    if (!isbn) {
      return NextResponse.json({ error: "isbn is required" }, { status: 400 });
    }

    const description = await fetchDescriptionFromOpenLibrary(isbn);

    // Persist immediately so the app works offline on subsequent loads
    if (bookId && description) {
      await prisma.book.update({
        where: { id: bookId },
        data: {
          description,
          descriptionSource: "openlibrary",
          descriptionUpdatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ description, source: "openlibrary" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch description";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
