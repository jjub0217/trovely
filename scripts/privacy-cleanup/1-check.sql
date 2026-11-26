-- [1단계: 확인만] 운영 Supabase SQL Editor에서 실행한다. 아무것도 바꾸지 않는다.
-- 결과는 숫자만 나온다(이메일은 화면에 나오지 않는다).
-- 반드시 마이그레이션(20261126090000_withdrawal_remove_personal_info) 적용 전에 실행한다.

-- 탈퇴 뒤 다시 로그인하지 않은 계정 = 지울 대상
-- 탈퇴 뒤 다시 로그인한 계정 = 지우지 않고 따로 판단(다시 쓰는 사람일 수 있음)
with w as (
  select lower(email) as email, max("createdAt") as withdrawn_at
  from "Withdrawal"
  group by lower(email)
),
matched as (
  select u.id, u.raw_user_meta_data ->> 'provider' as provider,
         (u.last_sign_in_at is null or u.last_sign_in_at <= w.withdrawn_at) as stale
  from auth.users u
  join w on lower(u.email) = w.email
)
select
  (select count(*) from "Withdrawal")                       as "탈퇴 기록 수",
  (select count(*) from "Withdrawal" where email is not null) as "이메일이 남은 탈퇴 기록",
  (select count(*) from "Withdrawal" where detail is not null and detail <> '') as "직접 쓴 사유가 남은 탈퇴 기록",
  (select count(*) from matched where stale)                as "지울 로그인 계정",
  (select count(*) from matched where stale and provider = 'kakao') as "그중 카카오 가입",
  (select count(*) from "Reel" r join matched m on r."userId" = m.id::text where m.stale) as "지울 계정에 남은 게시물",
  (select count(*) from "Category" c join matched m on c."userId" = m.id::text where m.stale) as "지울 계정에 남은 카테고리",
  (select count(*) from "Tag" t join matched m on t."userId" = m.id::text where m.stale) as "지울 계정에 남은 태그",
  (select count(*) from matched where not stale)            as "탈퇴 뒤 다시 로그인한 계정(지우지 않음)";
