import { NextRequest, NextResponse } from "next/server";
import { lookupBookByISBN, searchBooksByTitle } from "@/lib/openlibrary";

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get("isbn");
  const query = request.nextUrl.searchParams.get("q");

  // Search by title
  if (query) {
    const results = await searchBooksByTitle(query);
    return NextResponse.json(results);
  }

  // Lookup by ISBN
  if (isbn) {
    const result = await lookupBookByISBN(isbn);
    if (!result) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "ISBN or search query (q) is required" }, { status: 400 });
}
