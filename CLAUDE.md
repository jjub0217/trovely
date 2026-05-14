# Trove

인스타그램 게시물과 유튜브 영상을 카테고리/태그/메모/후기와 함께 저장하고 검색할 수 있는 개인 웹 서비스.

## 기술 스택

- **Next.js 16** App Router + Turbopack
- **Prisma 7** + `@prisma/adapter-pg` (pg Pool 직접 생성)
- **PostgreSQL** (로컬: brew, 프로덕션: Supabase)
- **Tailwind CSS v4**
- **Vercel** 배포 (Seoul icn1 리전)

## 배포 정보

- GitHub: https://github.com/jjub0217/trove
- Vercel: https://trovely.vercel.app/
- Supabase Project ID: fjgrfpaatdjavqgzmpiv (Seoul 리전)
- 런타임 DB: Transaction pooler (포트 6543)
- 마이그레이션 DB: Session pooler (포트 5432)

## 주요 구조

- `src/lib/db.ts` — Prisma 클라이언트 (pg Pool + SSL)
- `src/lib/actions.ts` — Server Actions (CRUD, 검색, 토글)
- `src/lib/og.ts` — 썸네일 추출 (Instagram → Microlink.io API)
- `src/components/` — 클라이언트 컴포넌트 (reel-card, reel-form, tag-input 등)
- `src/app/page.tsx` — 메인 페이지 (검색, 카테고리 필터, 콘텐츠 그리드)
- `src/app/categories/` — 카테고리 관리 페이지

## DB 스키마 요약

- Reel: url, thumbnail, memo, review, visited
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
