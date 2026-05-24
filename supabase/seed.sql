-- 로컬 Supabase 시드 (supabase db reset / 최초 start 시 실행)
-- 운영 Supabase엔 있지만 로컬 supabase start는 빈 상태로 시작하는 것들을 채운다.

-- 썸네일 캐시용 Storage 버킷 (src/lib/thumbnail-cache.ts가 사용)
-- 없으면 cacheThumbnail 업로드가 실패해 외부 raw URL로 폴백된다.
insert into storage.buckets (id, name, public)
values ('reel-thumbnails', 'reel-thumbnails', true)
on conflict (id) do nothing;
