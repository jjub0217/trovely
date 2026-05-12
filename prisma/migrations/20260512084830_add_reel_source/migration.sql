-- CreateEnum
CREATE TYPE "ReelSource" AS ENUM ('instagram', 'youtube');

-- AlterTable
ALTER TABLE "Reel" ADD COLUMN     "source" "ReelSource" NOT NULL DEFAULT 'instagram';
