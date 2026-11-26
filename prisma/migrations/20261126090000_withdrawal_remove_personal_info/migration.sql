-- 탈퇴 기록에서 개인을 알아볼 수 있는 정보를 지운다(이메일, 직접 쓴 탈퇴 사유).
-- 주의: 운영에서는 scripts/privacy-cleanup의 1, 2번을 먼저 실행한 뒤 이 마이그레이션을 적용한다.
-- (이미 탈퇴한 사람의 남은 로그인 계정을 찾을 때 이 이메일 칸을 쓰기 때문)
ALTER TABLE "Withdrawal" DROP COLUMN "email",
DROP COLUMN "detail";
