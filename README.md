# Trove

인스타그램 게시물과 유튜브 영상을 카테고리, 태그, 메모, 후기와 함께 저장하고 검색할 수 있는 개인 웹 서비스.

> 다시 보고 싶은 인스타그램 게시물과 유튜브 영상을 그때그때 찜해두고, 나중에 카테고리·태그·키워드로 한눈에 찾아보기 위해 만든 개인용 도구.

## 배포

- **프로덕션**: https://trovely.vercel.app
- **어드민**: https://trovely.vercel.app/admin
- **저장소**: https://github.com/jjub0217/trove

## 기술 스택

- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4
- **Database**: Supabase PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)
- **Auth**: Supabase Auth (`@supabase/ssr`)
- **Storage**: Supabase Storage (썸네일 영구 보관)
- **External APIs**: [Microlink](https://microlink.io), [iframely](https://iframely.com) (썸네일 추출)
- **Deploy**: Vercel (Seoul icn1 리전)
- **Icons**: Lucide React
- **Charts**: Recharts

## 주요 기능

### 사용자

- 콘텐츠 URL 저장 (썸네일 자동 추출 + Supabase Storage에 영구 캐싱)
- 카테고리 다중 선택 / 태그 / 메모 / 후기
- 방문 완료 별(★) 토글
- 다중 키워드 AND 검색 (메모, 후기, 태그, 카테고리 동시 매칭)
- 카테고리 필터 + 무한 스크롤
- 카테고리/태그 관리 (추가/수정/삭제)
- 회원가입 / 로그인 / 비밀번호 재설정
- 회원탈퇴 (사유 선택)
- PWA (홈 화면 추가)

### 어드민

- 통합 대시보드 (통계 카드 6개 + 탭 차트 4개)
- 유저 관리 (검색, 상태 필터, 상세 모달, 관리자 권한 부여)
- 탈퇴 관리 (탈퇴 이력 테이블, 상세 모달)

## 썸네일 처리 흐름

인스타그램 CDN의 썸네일 URL은 만료 시간과 지역 정보가 서명에 박혀 있어, 며칠 지나거나 다른 지역에서 열면 깨집니다. 이를 막기 위해 추출한 이미지를 곧바로 Supabase Storage에 복사해서 영구 URL로 저장합니다.

```
[콘텐츠 추가]
   ↓
[1] Microlink로 썸네일 추출 시도
   ↓ 실패 시
[2] iframely로 폴백 추출
   ↓ 실패 시
[3] 직접 OG 태그 스크래핑
   ↓ 성공한 이미지 URL
[이미지 다운로드 → Supabase Storage(reel-thumbnails 버킷) 업로드]
   ↓
[영구 URL을 DB에 저장]
```

핵심 코드: [`src/lib/og.ts`](src/lib/og.ts), [`src/lib/thumbnail-cache.ts`](src/lib/thumbnail-cache.ts)

## 프로젝트 구조

```
src/
├── app/
│   ├── (main)/                # 메인 앱 (max-w-420px 모바일 레이아웃)
│   │   ├── page.tsx           # 메인 페이지 (검색, 필터, 콘텐츠 그리드)
│   │   ├── login/             # 로그인
│   │   ├── signup/            # 회원가입
│   │   ├── forgot-password/   # 비밀번호 재설정
│   │   ├── reels/
│   │   │   ├── new/           # 콘텐츠 추가
│   │   │   └── [id]/          # 상세 / 수정
│   │   ├── archive/           # 아카이브
│   │   ├── tags/              # 태그 관리
│   │   ├── categories/        # 카테고리 관리
│   │   └── settings/          # 비밀번호 변경
│   ├── admin/                 # 어드민 (풀스크린 레이아웃)
│   │   ├── page.tsx           # 대시보드
│   │   └── members/           # 유저 관리 / 탈퇴 관리
│   └── layout.tsx             # 루트 레이아웃
├── components/                # 클라이언트 컴포넌트
├── lib/
│   ├── actions.ts             # Server Actions (CRUD, 검색)
│   ├── admin-actions.ts       # 어드민 Server Actions
│   ├── auth.ts                # requireAuth() 헬퍼
│   ├── db.ts                  # Prisma 클라이언트 (pg Pool + SSL)
│   ├── og.ts                  # 썸네일 추출 (Microlink/iframely/OG)
│   ├── thumbnail-cache.ts     # Supabase Storage 캐싱
│   ├── reel-url.ts            # 콘텐츠 URL 정규화 (인스타/유튜브)
│   └── supabase/              # 서버/클라이언트 Supabase 인스턴스
├── middleware.ts              # 인증 미들웨어
└── types/                     # 공용 TypeScript 타입

scripts/
└── recache-thumbnails.ts      # 기존 콘텐츠 썸네일 일괄 재캐싱 스크립트

prisma/
└── schema.prisma              # DB 스키마 정의
```

## DB 스키마

| 모델 | 설명 |
|---|---|
| `Reel` | 콘텐츠 본체 (url, thumbnail, memo, review, visited, userId) |
| `Category` | 카테고리 (사용자별 unique) |
| `Tag` | 태그 (사용자별 unique) |
| `ReelCategory`, `ReelTag` | N:M 매핑 테이블 |
| `AdminRole` | 관리자 권한 |
| `Withdrawal` | 회원탈퇴 이력 |

모든 사용자 데이터는 `userId`로 격리되어 있고, `Reel.url`은 사용자 단위로 unique입니다.

## 환경변수

```env
# Postgres (Supabase Transaction Pooler — 포트 6543)
DATABASE_URL="postgresql://postgres.xxxx:password@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"

# Supabase 공개 키 (클라이언트/서버 모두)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Supabase 서비스 롤 키 (서버 전용, Storage 업로드용)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# iframely 폴백 API 키
IFRAMELY_API_KEY=your-iframely-api-key
```

> `SUPABASE_SERVICE_ROLE_KEY`와 `IFRAMELY_API_KEY`는 **절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.** 클라이언트 번들에 노출되면 보안 사고로 이어집니다. 두 키 모두 서버 사이드(Server Actions, Route Handlers, Scripts)에서만 사용합니다.

## 시작하기

### 1. 사전 준비

- Node.js **22.12+** 또는 **24+** (Prisma 7 요구사항)
- Supabase 프로젝트 (Auth, Storage, DB 한 번에)
- [iframely](https://iframely.com) 무료 가입 → API 키 발급

### 2. 설치

```bash
git clone https://github.com/jjub0217/trove.git
cd trove
npm install
```

### 3. 환경 변수 설정

위 환경변수 섹션을 참고해 `.env.local` 파일을 만듭니다.

### 4. DB 마이그레이션

```bash
# 마이그레이션은 Session Pooler(포트 5432)로 실행해야 합니다
DATABASE_URL="postgresql://...:5432/postgres" npx prisma migrate deploy
```

### 5. Supabase Storage 버킷 생성

Supabase 대시보드 → **Storage** → New bucket
- 이름: `reel-thumbnails`
- Public bucket 체크

### 6. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속.

## 사용 가능한 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과로 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run recache-thumbnails` | 기존 콘텐츠 썸네일을 Storage로 일괄 이전 (최신 50개씩, 매일 실행 권장) |

`recache-thumbnails`는 외부 라이브러리가 아니라 [`scripts/recache-thumbnails.ts`](scripts/recache-thumbnails.ts)를 실행하는 별명입니다. Microlink 무료 한도(50/일)에 맞춰 한 번에 50개씩만 처리하므로, 콘텐츠가 많다면 며칠에 걸쳐 매일 한 번씩 실행하면 됩니다.

## 배포 시 주의사항

- DB 마이그레이션은 프로덕션에도 별도 실행 필요: `DATABASE_URL="..." npx prisma migrate deploy`
- Transaction Pooler(6543)는 마이그레이션 불가 → **Session Pooler(5432)** 를 사용
- DB에 접근하는 페이지는 반드시 `export const dynamic = "force-dynamic"` 추가 (Next.js 정적 빌드 캐시 회피)
- `package.json`에 `"postinstall": "prisma generate"`가 설정되어 있어야 Vercel 빌드 시 Prisma Client가 자동 생성됨
- Vercel 환경변수에도 `.env.local`의 5개 키를 모두 등록해야 함

## 향후 계획

- 콘텐츠 자동 정리 (오래된/중복/깨진 항목)
- 카테고리별 통계 / 시청 패턴 차트
- PWA 강화 (오프라인 캐싱)
- 외부 공유 링크 생성

## 라이선스

개인 프로젝트로 운영 중이며 별도의 오픈 라이선스는 적용하지 않습니다. 코드 참고는 자유롭게 하시되, 그대로 배포하는 것은 자제 부탁드립니다.
