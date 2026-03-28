-- CreateTable
CREATE TABLE "RoomFixture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "label" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📦',
    "layoutX" REAL NOT NULL DEFAULT 10,
    "layoutY" REAL NOT NULL DEFAULT 10,
    "layoutWidth" REAL NOT NULL DEFAULT 15,
    "layoutHeight" REAL NOT NULL DEFAULT 15,
    "layoutRotation" REAL NOT NULL DEFAULT 0,
    "borderStyle" TEXT NOT NULL DEFAULT 'solid',
    "bgColor" TEXT NOT NULL DEFAULT 'bg-gray-100/50',
    "position" INTEGER NOT NULL DEFAULT 0
);
