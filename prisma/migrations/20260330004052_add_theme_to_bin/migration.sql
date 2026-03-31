-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'General',
    "shelfId" TEXT NOT NULL,
    CONSTRAINT "Bin_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Bin" ("id", "label", "number", "shelfId") SELECT "id", "label", "number", "shelfId" FROM "Bin";
DROP TABLE "Bin";
ALTER TABLE "new_Bin" RENAME TO "Bin";
CREATE INDEX "Bin_shelfId_idx" ON "Bin"("shelfId");
CREATE UNIQUE INDEX "Bin_shelfId_number_key" ON "Bin"("shelfId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
