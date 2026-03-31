-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "categoryId" TEXT,
    "qualifierId" TEXT,
    "binId" TEXT,
    "resourceId" TEXT,
    "resourceCategoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_qualifierId_fkey" FOREIGN KEY ("qualifierId") REFERENCES "Qualifier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_resourceCategoryId_fkey" FOREIGN KEY ("resourceCategoryId") REFERENCES "ResourceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Book" ("author", "binId", "categoryId", "coverImageUrl", "createdAt", "id", "isbn", "qualifierId", "resourceId", "title", "totalCopies", "updatedAt") SELECT "author", "binId", "categoryId", "coverImageUrl", "createdAt", "id", "isbn", "qualifierId", "resourceId", "title", "totalCopies", "updatedAt" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
