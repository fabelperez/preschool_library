export interface BookLookupResult {
  title: string;
  author: string;
  coverImageUrl: string | null;
  isbn: string;
}

export interface BookSearchResult {
  title: string;
  author: string;
  coverImageUrl: string | null;
  isbn: string | null;
  firstPublishYear: number | null;
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

export async function searchBooksByTitle(query: string): Promise<BookSearchResult[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=title,author_name,isbn,cover_i,first_publish_year`
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return [];

    return data.docs.map((doc: {
      title?: string;
      author_name?: string[];
      isbn?: string[];
      cover_i?: number;
      first_publish_year?: number;
    }) => ({
      title: doc.title || "",
      author: doc.author_name?.[0] || "Unknown",
      coverImageUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
      isbn: doc.isbn?.[0] || null,
      firstPublishYear: doc.first_publish_year || null,
    }));
  } catch {
    return [];
  }
}
