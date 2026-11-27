
-- CreateTable
CREATE TABLE "AiSearchConsent" (
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "consentedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AiSearchConsent_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AiSearchConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSearchConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryEmbeddingCache" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryEmbeddingCache_pkey" PRIMARY KEY ("userId","day","model","textHash")
);

-- CreateTable
CREATE TABLE "AiUsageUser" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsageUser_pkey" PRIMARY KEY ("userId","day","kind")
);

-- CreateTable
CREATE TABLE "AiUsageTotal" (
    "day" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsageTotal_pkey" PRIMARY KEY ("day","kind")
);

-- CreateIndex
CREATE INDEX "AiSearchConsentLog_userId_idx" ON "AiSearchConsentLog"("userId");


-- 공개 API(Supabase anon 키)로 읽고 쓰지 못하게 막는다. 서버는 DB 주소로 직접 연결해서 쓴다(표 주인이라 영향 없음).
ALTER TABLE "AiSearchConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiSearchConsentLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QueryEmbeddingCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageTotal" ENABLE ROW LEVEL SECURITY;
