-- 게시물 전체 만들기가 한 사람에게 동시에 두 번 돌지 않게 하는 시각 칸
ALTER TABLE "AiSearchConsent" ADD COLUMN "buildingUntil" TIMESTAMP(3);
