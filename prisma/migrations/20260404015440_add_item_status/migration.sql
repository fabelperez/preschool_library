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
    "status" TEXT NOT NULL DEFAULT 'available',
    "statusNote" TEXT,
    "statusUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_qualifierId_fkey" FOREIGN KEY ("qualifierId") REFERENCES "Qualifier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_resourceCategoryId_fkey" FOREIGN KEY ("resourceCategoryId") REFERENCES "ResourceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Book" ("author", "binId", "categoryId", "coverImageUrl", "createdAt", "id", "isbn", "qualifierId", "resourceCategoryId", "resourceId", "title", "totalCopies", "updatedAt") SELECT "author", "binId", "categoryId", "coverImageUrl", "createdAt", "id", "isbn", "qualifierId", "resourceCategoryId", "resourceId", "title", "totalCopies", "updatedAt" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
CREATE TABLE "new_Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "resourceCategoryId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "statusNote" TEXT,
    "statusUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_resourceCategoryId_fkey" FOREIGN KEY ("resourceCategoryId") REFERENCES "ResourceCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Resource_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Resource" ("binId", "createdAt", "description", "id", "name", "quantity", "resourceCategoryId", "updatedAt") SELECT "binId", "createdAt", "description", "id", "name", "quantity", "resourceCategoryId", "updatedAt" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE INDEX "Resource_binId_idx" ON "Resource"("binId");
CREATE INDEX "Resource_resourceCategoryId_idx" ON "Resource"("resourceCategoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
