-- 2026-11-24 이전 파일로 만든 표 3개는 RLS가 꺼진 채 운영에 만들어졌다(다른 표는 켜져 있음, 2026-11-27 운영 확인).
-- Supabase 공개 키(브라우저 코드에 들어 있음)로 읽고 쓰지 못하게 막는다. 서버는 표 주인 계정으로 연결해서 영향 없다.
ALTER TABLE "ImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReelEmbedding" ENABLE ROW LEVEL SECURITY;
