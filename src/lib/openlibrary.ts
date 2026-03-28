export interface BookLookupResult {
  title: string;
  author: string;
  coverImageUrl: string | null;
  isbn: string;
}

export async function lookupBookByISBN(isbn: string): Promise<BookLookupResult | null> {
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    if (!res.ok) return null;
    
    const data = await res.json();
    const bookData = data[`ISBN:${isbn}`];
    if (!bookData) return null;

    return {
      title: bookData.title || "",
      author: bookData.authors?.[0]?.name || "Unknown",
      coverImageUrl: bookData.cover?.medium || bookData.cover?.small || null,
      isbn,
    };
  } catch {
    return null;
  }
}
