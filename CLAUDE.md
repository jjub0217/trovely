# Trovely

인스타그램 게시물과 유튜브 영상을 카테고리/태그/메모/후기와 함께 저장하고 검색할 수 있는 개인 웹 서비스.

## 기술 스택

- **Next.js 16** App Router + Turbopack
- **Prisma 7** + `@prisma/adapter-pg` (pg Pool 직접 생성)
- **PostgreSQL** (로컬: Docker Supabase, 프로덕션: Supabase 클라우드)
- **Tailwind CSS v4**
- **Vercel** 배포 (Seoul icn1 리전)

## 배포 정보

- GitHub: https://github.com/jjub0217/trovely
- Vercel: https://trovely.vercel.app/
- Supabase Project ID: fjgrfpaatdjavqgzmpiv (Seoul 리전)
- 런타임 DB: Transaction pooler (포트 6543)
- 마이그레이션 DB: Session pooler (포트 5432)

## 로컬 개발 환경 (Docker + Supabase)

운영(Supabase 클라우드)과 동일한 환경을 로컬 Docker로 띄워 개발한다. 로컬 작업이 운영 DB를 건드리지 않도록 분리되어 있다.

### 사전 준비 (최초 1회)

- Docker Desktop 설치 + 실행
- Supabase CLI: `brew install supabase/tap/supabase`

### 일상 작업 흐름

```bash
supabase start   # 로컬 컨테이너 기동 (DB:54322 / Studio:54323 / API:54321)
npm run dev      # 앱 실행 → 로컬 DB 사용
supabase stop    # 종료 (데이터·이미지는 보존)
```

### 로컬 접속 정보 (고정 기본값, 비밀 아님)

- DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio(로컬 대시보드): http://127.0.0.1:54323
- 로컬 DB에 스키마 적용: `npx prisma migrate deploy`

### dev/prod DB 분리 규칙 (중요)

- `.env`의 `DATABASE_URL` = 로컬 Docker DB(활성). 운영 URL은 주석으로 보존.
- 운영 `DATABASE_URL`·비밀값은 **Vercel 환경변수에만** 보관 (로컬 디스크에 두지 않음).
- ⚠️ **함정**: Next.js 런타임은 `.env.local`을 `.env`보다 우선해 읽지만, **Prisma(`prisma.config.ts`)는 `.env`만 읽는다.** 그래서 로컬 주소는 반드시 `.env`에 둔다 — 안 그러면 `prisma migrate`가 운영 DB를 때릴 수 있음.

## 주요 구조

- `src/lib/db.ts` — Prisma 클라이언트 (pg Pool + SSL)
- `src/lib/actions.ts` — Server Actions (CRUD, 검색, 토글)
- `src/lib/og.ts` — 썸네일 추출 (YouTube: oembed / Instagram·기타: Microlink → Iframely 폴백 → 직접 fetch)
- `src/components/` — 클라이언트 컴포넌트 (reel-card, reel-form, tag-input 등)
- `src/app/page.tsx` — 메인 페이지 (검색, 카테고리 필터, 콘텐츠 그리드)
- `src/app/categories/` — 카테고리 관리 페이지

## DB 스키마 요약

- Reel: url, thumbnail, memo, review, visited, source(instagram|youtube), userId
- Category: name (N:M via ReelCategory)
- Tag: name (N:M via ReelTag)

## 배포 시 주의사항

- DB 마이그레이션은 프로덕션에도 별도 실행 필요: `DATABASE_URL="..." npx prisma migrate deploy`
- Transaction pooler(6543)는 마이그레이션 불가 → Session pooler(5432) 사용
- DB 접근 페이지는 `export const dynamic = "force-dynamic"` 필수
- `package.json`에 `"postinstall": "prisma generate"` 필수

## 대화 스타일

- 사용자는 한국어로 대화
- 간결한 응답 선호
- 커밋/푸쉬는 사용자가 요청할 때만
