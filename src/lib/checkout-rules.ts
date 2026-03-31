import { prisma } from "@/lib/prisma";

/**
 * Determines the resourceCategoryId for a book's Teacher Resource theme, if any.
 * A book belongs to a TR theme via:
 *   1. book.resourceCategoryId (directly tagged)
 *   2. book.resource.resourceCategoryId (via attached resource)
 */
export async function getBookThemeCategoryId(bookId: string): Promise<string | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      resourceCategoryId: true,
      qualifier: { select: { name: true } },
      resource: { select: { resourceCategoryId: true } },
    },
  });
  if (!book) return null;

  const isTeacherResource =
    book.qualifier?.name === "Teacher Resource" || !!book.resource;
  if (!isTeacherResource) return null;

  return book.resourceCategoryId || book.resource?.resourceCategoryId || null;
}

/**
 * Returns the active (unreturned) theme checkout for a given resourceCategoryId, if any.
 */
export async function getActiveThemeCheckout(resourceCategoryId: string) {
  return prisma.checkout.findFirst({
    where: {
      type: "THEME",
      resourceCategoryId,
      returnedAt: null,
    },
    include: { teacher: true, resourceCategory: true },
  });
}

/**
 * Returns all resourceCategoryIds that currently have an active theme checkout.
 */
export async function getCheckedOutThemeIds(): Promise<Set<string>> {
  const themeCheckouts = await prisma.checkout.findMany({
    where: { type: "THEME", returnedAt: null },
    select: { resourceCategoryId: true },
  });
  return new Set(
    themeCheckouts.map((c) => c.resourceCategoryId).filter(Boolean) as string[]
  );
}

/**
 * Checks whether a book belongs to a Teacher Resource theme that is currently
 * checked out. Returns { blocked, themeName, teacherName } for the UI warning.
 */
export async function checkBookThemeRestriction(bookId: string) {
  const themeCatId = await getBookThemeCategoryId(bookId);
  if (!themeCatId) return { blocked: false } as const;

  const activeThemeCheckout = await getActiveThemeCheckout(themeCatId);
  if (activeThemeCheckout) {
    return {
      blocked: true,
      reason: "theme_checked_out" as const,
      themeName: activeThemeCheckout.resourceCategory?.name ?? "Unknown",
      teacherName: activeThemeCheckout.teacher.name,
    };
  }

  // Theme exists but is not currently checked out — allow individual checkout
  return { blocked: false } as const;
}
