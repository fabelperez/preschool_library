-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shelf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "layoutX" REAL NOT NULL DEFAULT 0,
    "layoutY" REAL NOT NULL DEFAULT 0,
    "layoutWidth" REAL NOT NULL DEFAULT 25,
    "layoutHeight" REAL NOT NULL DEFAULT 14,
    "layoutRotation" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Shelf" ("id", "name", "position") SELECT "id", "name", "position" FROM "Shelf";
DROP TABLE "Shelf";
ALTER TABLE "new_Shelf" RENAME TO "Shelf";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
