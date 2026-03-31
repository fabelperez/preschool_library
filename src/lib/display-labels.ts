/**
 * Display-only label helpers. Do NOT change database values —
 * these map internal qualifier/type to user-facing text.
 */

export function getDisplayCategory(item: {
  isBook: boolean;
  isTeacherResource: boolean;
}): string {
  if (item.isTeacherResource) {
    return item.isBook ? "Teacher Resource Books" : "Teacher Resource Materials";
  }
  return "General Books";
}

export const LABEL_TR_MATERIALS = "Teacher Resource Materials";
export const LABEL_TR_BOOKS = "Teacher Resource Books";
export const LABEL_GENERAL_BOOKS = "General Books";
