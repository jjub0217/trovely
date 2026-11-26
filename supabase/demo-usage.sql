-- 데모 전용 Supabase 프로젝트에서 한 번 실행한다(운영 DB에서 실행하지 않는다).
-- 데모 링크의 하루 AI 사용량을 센다. 날짜(한국 시각)와 기능 종류마다 한 줄.
create table if not exists demo_usage (
  day date not null,
  kind text not null,
  count integer not null default 0,
  primary key (day, kind)
);

-- 공개 API(anon 키)로는 읽고 쓰지 못하게 막는다. 서버는 DB 주소로 직접 연결해서 쓴다.
alter table demo_usage enable row level security;
