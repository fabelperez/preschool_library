-- CreateTable
CREATE TABLE "Qualifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ResourceCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Bin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "shelfId" TEXT NOT NULL,
    CONSTRAINT "Bin_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "resourceCategoryId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_resourceCategoryId_fkey" FOREIGN KEY ("resourceCategoryId") REFERENCES "ResourceCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Resource_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceCheckout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "checkedOutAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" DATETIME,
    CONSTRAINT "ResourceCheckout_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceCheckout_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_qualifierId_fkey" FOREIGN KEY ("qualifierId") REFERENCES "Qualifier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Book" ("author", "categoryId", "coverImageUrl", "createdAt", "id", "isbn", "title", "totalCopies", "updatedAt") SELECT "author", "categoryId", "coverImageUrl", "createdAt", "id", "isbn", "title", "totalCopies", "updatedAt" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
CREATE TABLE "new_Shelf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'book',
    "position" INTEGER NOT NULL DEFAULT 0,
    "layoutX" REAL NOT NULL DEFAULT 0,
    "layoutY" REAL NOT NULL DEFAULT 0,
    "layoutWidth" REAL NOT NULL DEFAULT 25,
    "layoutHeight" REAL NOT NULL DEFAULT 14,
    "layoutRotation" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Shelf" ("id", "layoutHeight", "layoutRotation", "layoutWidth", "layoutX", "layoutY", "name", "position") SELECT "id", "layoutHeight", "layoutRotation", "layoutWidth", "layoutX", "layoutY", "name", "position" FROM "Shelf";
DROP TABLE "Shelf";
ALTER TABLE "new_Shelf" RENAME TO "Shelf";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Qualifier_name_key" ON "Qualifier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceCategory_name_key" ON "ResourceCategory"("name");

-- CreateIndex
CREATE INDEX "Bin_shelfId_idx" ON "Bin"("shelfId");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_shelfId_number_key" ON "Bin"("shelfId", "number");

-- CreateIndex
CREATE INDEX "Resource_binId_idx" ON "Resource"("binId");

-- CreateIndex
CREATE INDEX "Resource_resourceCategoryId_idx" ON "Resource"("resourceCategoryId");

-- CreateIndex
CREATE INDEX "ResourceCheckout_resourceId_idx" ON "ResourceCheckout"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceCheckout_teacherId_idx" ON "ResourceCheckout"("teacherId");
