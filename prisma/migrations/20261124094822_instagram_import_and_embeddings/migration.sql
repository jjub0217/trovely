-- pgvector: 게시물 벡터 저장용
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Reel" ADD COLUMN     "caption" TEXT;

-- CreateTable
CREATE TABLE "ReelEmbedding" (
    "reelId" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "textHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReelEmbedding_pkey" PRIMARY KEY ("reelId")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportCandidate" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL,
    "keptCategories" TEXT[],
    "fromCollections" TEXT[],
    "needsAi" BOOLEAN NOT NULL,
    "suggestedCategories" TEXT[],
    "newCategories" TEXT[],
    "tags" TEXT[],
    "uncertain" BOOLEAN NOT NULL DEFAULT false,
    "suggested" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "ImportCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");

-- CreateIndex
CREATE INDEX "ImportCandidate_batchId_status_idx" ON "ImportCandidate"("batchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportCandidate_batchId_url_key" ON "ImportCandidate"("batchId", "url");

-- AddForeignKey
ALTER TABLE "ReelEmbedding" ADD CONSTRAINT "ReelEmbedding_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportCandidate" ADD CONSTRAINT "ImportCandidate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
