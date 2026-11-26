-- [2단계: 삭제] 1단계 숫자를 확인하고 진행하기로 한 뒤에만 실행한다. 되돌릴 수 없다.
-- 탈퇴 뒤 다시 로그인하지 않은 계정의 로그인 계정과 남은 앱 데이터를 지운다.
-- (로그인 계정을 지우면 Supabase가 auth.identities, auth.sessions의 연결 기록도 함께 지운다)
-- 실행 뒤 마이그레이션을 적용하면 탈퇴 기록의 이메일, 직접 쓴 사유 칸이 사라진다.
begin;

create temporary table stale_withdrawn on commit drop as
with w as (
  select lower(email) as email, max("createdAt") as withdrawn_at
  from "Withdrawal"
  group by lower(email)
)
select u.id
from auth.users u
join w on lower(u.email) = w.email
where u.last_sign_in_at is null or u.last_sign_in_at <= w.withdrawn_at;

delete from "ReelCategory" where "reelId" in (select id from "Reel" where "userId" in (select id::text from stale_withdrawn));
delete from "ReelTag"      where "reelId" in (select id from "Reel" where "userId" in (select id::text from stale_withdrawn));
delete from "Reel"         where "userId" in (select id::text from stale_withdrawn);
delete from "Category"     where "userId" in (select id::text from stale_withdrawn);
delete from "Tag"          where "userId" in (select id::text from stale_withdrawn);
delete from "AdminRole"    where "userId" in (select id::text from stale_withdrawn);
delete from auth.users     where id in (select id from stale_withdrawn);

select count(*) as "지운 로그인 계정" from stale_withdrawn;
commit;
