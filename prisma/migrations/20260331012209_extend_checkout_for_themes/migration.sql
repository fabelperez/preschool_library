-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Checkout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'BOOK',
    "bookId" TEXT,
    "resourceCategoryId" TEXT,
    "teacherId" TEXT NOT NULL,
    "checkedOutAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" DATETIME,
    CONSTRAINT "Checkout_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Checkout_resourceCategoryId_fkey" FOREIGN KEY ("resourceCategoryId") REFERENCES "ResourceCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Checkout_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Checkout" ("bookId", "checkedOutAt", "id", "returnedAt", "teacherId") SELECT "bookId", "checkedOutAt", "id", "returnedAt", "teacherId" FROM "Checkout";
DROP TABLE "Checkout";
ALTER TABLE "new_Checkout" RENAME TO "Checkout";
CREATE INDEX "Checkout_bookId_idx" ON "Checkout"("bookId");
CREATE INDEX "Checkout_teacherId_idx" ON "Checkout"("teacherId");
CREATE INDEX "Checkout_resourceCategoryId_idx" ON "Checkout"("resourceCategoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
