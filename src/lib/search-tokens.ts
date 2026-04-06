/**
 * Shared search tokenizer and relevance scorer.
 *
 * Phase 1: rule-based keyword matching.
 * Phase 2 upgrade path: replace scoreBook / scoreResource with AI embedding
 * similarity — the tokenize() output can be sent to an embedding API, and
 * scored results sorted by cosine distance instead of field-weight sums.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "is", "it", "at",
  "be", "as", "by", "we", "me", "my", "us", "do", "so", "no",
  "for", "are", "was", "has", "had", "not", "but", "from", "with",
  "about", "want", "need", "find", "get", "have", "that", "this",
  "some", "can", "all", "also", "just", "its", "our", "what",
  "looking", "something", "would", "like", "any", "more",
  "book", "books", "resource", "resources", "story", "stories",
]);

/** Extract meaningful search tokens from a natural-language query. */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

export interface MatchHint {
  score: number;
  matchedFields: string[];
}

/** Score a book against a token list. Higher = better match. */
export function scoreBook(
  tokens: string[],
  book: {
    title: string;
    author: string;
    description?: string | null;
    category?: { name: string } | null;
    themeName?: string | null;
  }
): MatchHint {
  if (tokens.length === 0) return { score: 0, matchedFields: [] };

  const matchedFields: string[] = [];
  let score = 0;

  const titleLow = book.title.toLowerCase();
  const authorLow = book.author.toLowerCase();
  const descLow = (book.description ?? "").toLowerCase();
  const catLow = (book.category?.name ?? "").toLowerCase();
  const themeLow = (book.themeName ?? "").toLowerCase();

  for (const token of tokens) {
    if (titleLow.includes(token)) {
      score += 5;
      if (!matchedFields.includes("title")) matchedFields.push("title");
    }
    if (authorLow.includes(token)) {
      score += 4;
      if (!matchedFields.includes("author")) matchedFields.push("author");
    }
    if (descLow && descLow.includes(token)) {
      score += 3;
      if (!matchedFields.includes("description")) matchedFields.push("description");
    }
    if (catLow && catLow.includes(token)) {
      score += 4;
      if (!matchedFields.includes("category")) matchedFields.push("category");
    }
    if (themeLow && themeLow.includes(token)) {
      score += 4;
      if (!matchedFields.includes("theme")) matchedFields.push("theme");
    }
  }

  return { score, matchedFields };
}

/** Score a resource against a token list. */
export function scoreResource(
  tokens: string[],
  resource: {
    name: string;
    description?: string | null;
    themeName?: string | null;
    categoryName?: string | null;
  }
): MatchHint {
  if (tokens.length === 0) return { score: 0, matchedFields: [] };

  const matchedFields: string[] = [];
  let score = 0;

  const nameLow = resource.name.toLowerCase();
  const descLow = (resource.description ?? "").toLowerCase();
  const themeLow = (resource.themeName ?? "").toLowerCase();
  const catLow = (resource.categoryName ?? "").toLowerCase();

  for (const token of tokens) {
    if (nameLow.includes(token)) {
      score += 5;
      if (!matchedFields.includes("name")) matchedFields.push("name");
    }
    if (descLow && descLow.includes(token)) {
      score += 3;
      if (!matchedFields.includes("description")) matchedFields.push("description");
    }
    if (themeLow && themeLow.includes(token)) {
      score += 4;
      if (!matchedFields.includes("theme")) matchedFields.push("theme");
    }
    if (catLow && catLow.includes(token)) {
      score += 3;
      if (!matchedFields.includes("category")) matchedFields.push("category");
    }
  }

  return { score, matchedFields };
}
