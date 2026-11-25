# 썸네일 복원력(Resilience) 설계 — reelbox 과제 1

- 작성일: 2026-05-24 (일) / 업데이트: 2026-05-24 (as-built 반영)
- 상태: 구현 완료 (PR #2, branch `feat/thumbnail-resilience`)

## 배경 / 문제 재정의

reelbox는 인스타/유튜브를 저장하는 **개인 스크랩북**. 썸네일은 발행자의 광고판이 아니라 **"내가 알아보는 기억의 표지"**다.

원 과제 문구는 "발행자가 썸네일을 바꾸면 어떻게 인지/갱신?"이지만, 제품 취지로 재해석하면 사용자가 실제로 아파하는 건 **"바뀜"이 아니라 "깨짐"**이다. 따라서 진짜 문제를 재정의:

> **"내가 저장한 썸네일이 (만료 등으로) 깨지지 않게 보장한다."**

- 발행자 변경 추적: **의도적으로 미구현**. 개인앱엔 우선순위 낮고, 1-B(자가복구)가 재추출 과정에서 부수적으로 최신 썸네일을 가져오므로 전용 로직 불필요.

## 현재 구조 & 빈틈

- 저장 시 `extractThumbnail(url)` → `cacheThumbnail(raw, url)`로 외부 이미지를 Supabase Storage(`reel-thumbnails`)에 복사하고 영구 URL을 `Reel.thumbnail`에 저장.
- **빈틈**: `og.ts`의 `return cached ?? raw` — 캐싱 실패 시 **만료되는 외부 URL(raw)**이 DB에 박힘 → 시간이 지나면 깨짐.

### 깨짐 원인 분류

| 원인 | 성격 | 재추출 복구 |
|------|------|-------------|
| ① 인스타 CDN URL 만료 | 흔함, 시간 경과 | 대체로 가능 |
| ② 원본 게시물 삭제/비공개 | 영구 | 불가 → 대체 UI |
| ③ 외부/네트워크 일시 장애 | 일시 | 가능 |
| ④ 환경 불일치(로컬 127.0.0.1 URL을 타 환경에서) | 엣지 | 가능 |

핵심: 가장 흔한 깨짐(①)은 `cached ?? raw`로 빠진 raw 외부 URL에 집중.

## 해결책 — 이중 방어

### 1-A. 저장 견고화 (예방, 저장 시점)

- `cacheThumbnail` 일시 실패(5xx·네트워크·빈 본문·업로드 에러) 시 **최대 3회 재시도**(0.5s/1.0s backoff). 영구 실패(4xx·비이미지)는 즉시 중단.
- 효과: 만료될 raw URL이 DB에 박히는 빈도↓ → 가장 흔한 깨짐(①) 사전 차단.

### 1-B. 깨짐 자가복구 (치료, 깨짐 시점)

- `<img onError>` → 서버 액션 `refreshThumbnail(reelId)` → 재추출 + DB갱신 → **그 자리서 src 즉시 교체**(캐시버스트로 강제 재로드).
- 무한루프 방지: 클라 상태 `triedRecovery`로 **1회만** 시도.
- 영구 실패(재추출도 실패): **대체 UI 고정**, 재시도 안 함.
- **(구현 중 발견) SSR onError race 보완**: SSR로 그려진 `<img>`가 하이드레이션 전에 로드 실패하면 React `onError`를 놓침 → "가끔만 동작". 해결: img를 `ref`로 잡고 마운트 후 `img.complete && img.naturalWidth === 0`(=이미 실패)면 복구를 직접 트리거.

## UI 상태 디자인 (구현 중 확정)

- **빈 썸네일**: lucide `ImageOff` 아이콘만(문구 없음) + 영역 배경 `bg-gray-700`(아래 태그 영역 `gray-800`와 색 구분 → 휑함 완화).
- **복구 중**: 배경만 은은한 펄스(`animate-pulse bg-gray-600`, 아이콘·텍스트 없음).
- **빈 카드**(태그·카테고리·메모 모두 없음): "+ 태그 추가" 점선 힌트(접지 않음 — *태그 = 기억의 단서* 철학상 태깅 유도). 단, 태그 있는 카드는 항상 태그 표시.
- 하단 메타 영역 패딩 `p-2.5`(10px).

## 로컬 인프라 (구현 중 발견)

- 로컬 Supabase(`supabase start`)엔 `reel-thumbnails` 버킷이 없어 `cacheThumbnail` 업로드 실패 → raw 폴백.
- 해결: `supabase/seed.sql`로 버킷 생성(운영 parity). 라이브 인스턴스에 직접 INSERT 시 storage 컨테이너가 못 읽어 재시작 필요했음(신규 `supabase start` 땐 seed가 선행되어 OK).

## 변경 파일

- `src/lib/thumbnail-cache.ts` — `cacheThumbnail` 재시도 (1-A)
- `src/lib/actions.ts` — `refreshThumbnail` 서버액션 (1-B 서버)
- `src/components/reel-thumbnail.tsx` — onError 자가복구 + SSR race 보완 + UI 상태 3종
- `src/components/reel-card.tsx` — `reelId` 전달 + "+ 태그 추가" 힌트 + 패딩
- `src/app/(main)/reels/[id]/page.tsx` — `reelId` 전달
- `supabase/seed.sql` — `reel-thumbnails` 버킷 (신규)

## 에러 / 엣지 처리

- 무한루프: `triedRecovery` 1회 가드
- SSR race: `ref` + `complete/naturalWidth` 마운트 체크
- 소유권: `refreshThumbnail`은 `requireAuth` + `userId`로 본인 reel만
- 영구 실패: 대체 UI 고정
- 데이터 모델 변경: **없음** (onError 기반, TTL 필드 불필요)

## 검증 (as-built)

- 프로젝트에 단위 테스트 러너 없음, eslint 설정 없음, 또 **stale Prisma client**로 `build`가 깨져 있었음 → `npx prisma generate`로 해결.
- 검증 = `npx tsc --noEmit`(0 에러) + 로컬 DB(Docker Supabase) 수동 시뮬.
- 결과: 깨진 썸네일 → 자가복구로 **로컬 Supabase 영구본 캐싱** 확인 / 쓰레기 URL → 대체 UI 고정(무한루프 없음).

## 구현 중 발견 (별도 기록 가치)

- **"빌드 깨짐"의 정체 = stale Prisma client**: `schema.prisma`엔 `source` 있는데 생성된 클라이언트 타입엔 없어 `reel.source` 쓰는 코드들이 타입에러 → `npx prisma generate`로 전부 해결. 코드 버그 아님. (Vercel은 `postinstall: prisma generate`로 매번 재생성 → 운영 빌드 영향 없음.)
- **eslint 설정 부재**: `eslint.config.*` 없어 `npm run lint` 실패 (cuddle-market엔 `eslint.config.mjs` 있음). → 별도 PR로 보완 예정.
- **로컬 Supabase storage 버킷 갭**: 위 "로컬 인프라" 참고 → `seed.sql`로 보완.

## 범위 밖 (의도적 제외)

- 발행자 변경 추적 전용 로직 (분석으로만 다룸).
- TTL 기반 사전 갱신 / cron 일괄 재캐싱 (개인앱엔 낭비).
- 과제 2(DB 쿼리 비용 캐싱) — 별도 레이어, "측정 먼저" 후 결정.
