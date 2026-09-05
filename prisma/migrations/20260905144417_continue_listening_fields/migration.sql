/*
  Warnings:

  - Added the required column `normalizedName` to the `Artist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ListeningHistory" ADD COLUMN "progressSec" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "thumbnailColor" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "monthlyListeners" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Artist" ("bio", "createdAt", "followers", "id", "imageUrl", "monthlyListeners", "name", "thumbnailColor", "updatedAt", "verified") SELECT "bio", "createdAt", "followers", "id", "imageUrl", "monthlyListeners", "name", "thumbnailColor", "updatedAt", "verified" FROM "Artist";
DROP TABLE "Artist";
ALTER TABLE "new_Artist" RENAME TO "Artist";
CREATE UNIQUE INDEX "Artist_name_key" ON "Artist"("name");
CREATE UNIQUE INDEX "Artist_normalizedName_key" ON "Artist"("normalizedName");
CREATE INDEX "Artist_name_idx" ON "Artist"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
