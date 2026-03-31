/**
 * Groups resources and books within a bin by their theme (ResourceCategory).
 * Books use their own resourceCategory first, then inherit from resource, then "General".
 */

export interface ThemeGroupResource {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  resourceCategory?: { id: string; name: string } | null;
}

export interface ThemeGroupBook {
  id: string;
  title: string;
  author: string;
  resourceCategory?: { id: string; name: string } | null;
  resource?: {
    resourceCategory?: { id: string; name: string } | null;
  } | null;
}

export interface ThemeGroup<R = ThemeGroupResource, B = ThemeGroupBook> {
  themeName: string;
  themeId: string | null;
  resources: R[];
  books: B[];
}

const DEFAULT_THEME = "General";

export function groupByTheme<
  R extends ThemeGroupResource,
  B extends ThemeGroupBook
>(
  resources: R[],
  books: B[]
): ThemeGroup<R, B>[] {
  const groups = new Map<string, ThemeGroup<R, B>>();

  for (const resource of resources) {
    const themeName = resource.resourceCategory?.name || DEFAULT_THEME;
    const themeId = resource.resourceCategory?.id || null;
    if (!groups.has(themeName)) {
      groups.set(themeName, { themeName, themeId, resources: [], books: [] });
    }
    groups.get(themeName)!.resources.push(resource);
  }

  for (const book of books) {
    // Book's own theme > inherited from resource > "General"
    const rc = book.resourceCategory || book.resource?.resourceCategory;
    const themeName = rc?.name || DEFAULT_THEME;
    const themeId = rc?.id || null;
    if (!groups.has(themeName)) {
      groups.set(themeName, { themeName, themeId, resources: [], books: [] });
    }
    groups.get(themeName)!.books.push(book);
  }

  // Sort: named themes alphabetically first, "General" last
  const sorted = Array.from(groups.values()).sort((a, b) => {
    if (a.themeName === DEFAULT_THEME) return 1;
    if (b.themeName === DEFAULT_THEME) return -1;
    return a.themeName.localeCompare(b.themeName);
  });

  return sorted;
}
