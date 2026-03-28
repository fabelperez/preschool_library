-- CreateTable
CREATE TABLE "BookSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "teacherId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookSubmission_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BookSubmission_status_idx" ON "BookSubmission"("status");

-- CreateIndex
CREATE INDEX "BookSubmission_teacherId_idx" ON "BookSubmission"("teacherId");
