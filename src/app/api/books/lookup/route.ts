import { NextRequest, NextResponse } from "next/server";
import { lookupBookByISBN } from "@/lib/openlibrary";

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get("isbn");
  
  if (!isbn) {
    return NextResponse.json({ error: "ISBN is required" }, { status: 400 });
  }

  const result = await lookupBookByISBN(isbn);
  
  if (!result) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
