# 썸네일 복원력 구현 계획 (reelbox 과제 1)

> **For agentic workers:** 이 계획은 task 단위로 구현한다. 각 step은 체크박스(`- [ ]`)로 추적.

**Goal:** 저장된 썸네일이 만료 등으로 깨지지 않도록, 저장 시 캐싱을 견고화(1-A)하고 깨진 썸네일을 자동 재추출·복구(1-B)한다.

**Architecture:** 예방(1-A) = `cacheThumbnail` 저장 시 일시 실패에 재시도. 치료(1-B) = `<img onError>` → 서버 액션 `refreshThumbnail`이 재추출+DB갱신 → 클라가 src를 즉시 교체(1회 가드, 영구 실패 시 대체 UI).

**Tech Stack:** Next.js 16(App Router), React 19(Server/Client Components), Prisma 7 + Postgres, Supabase Storage, TypeScript.

**테스트 전략(as-built):** reelbox엔 단위 테스트 러너가 없고, eslint 설정 부재 + stale Prisma client로 `lint`/`build`가 원래부터 깨져 있었다(→ `npx prisma generate`로 build 타입 해결). 따라서 검증은 **`npx tsc --noEmit`(타입체크 0 에러) + 로컬 DB(Docker Supabase) 수동 시뮬**로 했다.

**Git:** 커밋/푸시는 사용자 요청 시에만(reelbox 규칙). 마지막에 브랜치 → PR로 일괄 처리. 각 task의 "검증 통과"가 체크포인트.

**설계문서:** `docs/superpowers/specs/2026-05-24-thumbnail-resilience-design.md`

---

## 파일 구조 (변경 대상)

- `src/lib/thumbnail-cache.ts` — `cacheThumbnail`에 재시도 추가 (1-A)
- `src/lib/actions.ts` — `refreshThumbnail(reelId)` 서버 액션 추가 (1-B 서버)
- `src/components/reel-thumbnail.tsx` — `onError` 복구 로직 + 상태 (1-B 클라)
- `src/components/reel-card.tsx` — `ReelThumbnail`에 `reelId` 전달
- `src/app/(main)/reels/[id]/page.tsx` — 상세 페이지 `ReelThumbnail`에 `reelId` 전달

---

## Task 1: 1-A — `cacheThumbnail` 재시도 (저장 견고화)

**Files:**
- Modify: `src/lib/thumbnail-cache.ts` (함수 `cacheThumbnail`, 현재 29-75행)

- [ ] **Step 1: `cacheThumbnail` 본문을 재시도 루프로 교체**

기존 `cacheThumbnail` 함수 전체를 아래로 교체한다. 핵심: 일시 실패(5xx·네트워크·빈 본문·업로드 에러)는 최대 3회 재시도(backoff), 영구 실패(4xx·이미지 아님)는 즉시 중단.

```ts
export async function cacheThumbnail(
  externalUrl: string,
  stableKey: string
): Promise<string | null> {
  if (isCachedThumbnailUrl(externalUrl)) {
    return externalUrl;
  }

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(externalUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        // 4xx = 영구 실패(없는 리소스 등) → 재시도 무의미. 5xx만 재시도.
        if (response.status >= 400 && response.status < 500) return null;
        throw new Error(`status ${response.status}`);
      }

      const contentType =
        response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "image/jpeg";
      if (!contentType.startsWith("image/")) return null; // 이미지 아님 = 영구 실패

      const ext = MIME_EXT[contentType] ?? "jpg";

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.byteLength === 0) throw new Error("empty body");

      const hash = createHash("sha256").update(stableKey).digest("hex").slice(0, 32);
      const path = `${hash}.${ext}`;

      const supabase = getClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType, upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error(`[cacheThumbnail] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
      if (attempt === MAX_ATTEMPTS) return null;
      await new Promise((r) => setTimeout(r, 500 * attempt)); // 0.5s, 1.0s backoff
    }
  }
  return null;
}
```

- [ ] **Step 2: 타입/린트 검증**

Run: `npm run lint && npm run build`
Expected: 에러 없이 통과 (타입 OK).

- [ ] **Step 3: 동작 확인 (선택, 수동)**

`npm run recache-thumbnails 5` 실행 → 외부 URL 썸네일 몇 개가 Supabase URL로 갱신되는지 확인(재시도가 기존 흐름을 안 깨뜨리는지). 에러 로그에 `attempt x/3` 형식이 보이면 재시도 동작 중.

---

## Task 2: 1-B 서버 — `refreshThumbnail` 서버 액션

**Files:**
- Modify: `src/lib/actions.ts` (새 export 함수 추가. `requireAuth`, `prisma`, `extractThumbnail`, `revalidatePath`는 이미 import돼 있음)

- [ ] **Step 1: `refreshThumbnail` 함수 추가**

`actions.ts` 끝부분(다른 export 함수들 사이 아무 곳)에 추가:

```ts
export async function refreshThumbnail(
  reelId: string
): Promise<{ thumbnail: string | null }> {
  const userId = await requireAuth();

  // 소유권 확인 — 내 reel만
  const reel = await prisma.reel.findFirst({ where: { id: reelId, userId } });
  if (!reel) return { thumbnail: null };

  // 재추출 (extractThumbnail 내부에서 cacheThumbnail로 Supabase 영구화 시도)
  const fresh = await extractThumbnail(reel.url);
  if (!fresh) return { thumbnail: null }; // 영구 실패(삭제 등)

  await prisma.reel.update({
    where: { id: reel.id },
    data: { thumbnail: fresh },
  });
  revalidatePath("/");

  return { thumbnail: fresh };
}
```

- [ ] **Step 2: 타입/린트 검증**

Run: `npm run lint && npm run build`
Expected: 통과. (만약 `extractThumbnail`/`revalidatePath` import 누락 에러가 나면 상단 import에 추가 — `import { extractThumbnail } from "./og";`, `import { revalidatePath } from "next/cache";`)

---

## Task 3: 1-B 클라 — `reel-thumbnail.tsx` 자가복구

**Files:**
- Modify: `src/components/reel-thumbnail.tsx` (전체 교체)

- [ ] **Step 1: 컴포넌트를 복구 로직 포함 버전으로 교체**

파일 전체를 아래로 교체. 변경점: `reelId` prop 추가 / `currentSrc`·`triedRecovery` 상태 / `onError`에서 1회 재추출 복구 + 캐시버스트 / 복구 중·영구 실패 시 대체 UI.

```tsx
"use client";

import { useEffect, useState } from "react";
import { isRejectedThumbnailUrl } from "@/lib/thumbnail-url";
import { refreshThumbnail } from "@/lib/actions";

export function ReelThumbnail({
  src,
  reelId,
  alt = "",
  className,
  loading = "lazy",
  fetchPriority = "low",
  iconClassName = "text-gray-500 text-2xl",
  fallbackLabel,
}: {
  src?: string | null;
  reelId?: string;
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  iconClassName?: string;
  fallbackLabel?: string;
}) {
  const initialOk = !!src && !isRejectedThumbnailUrl(src);
  const [currentSrc, setCurrentSrc] = useState<string | null>(initialOk ? src! : null);
  const [failed, setFailed] = useState(!initialOk);
  const [triedRecovery, setTriedRecovery] = useState(false);

  useEffect(() => {
    const ok = !!src && !isRejectedThumbnailUrl(src);
    setCurrentSrc(ok ? src! : null);
    setFailed(!ok);
    setTriedRecovery(false);
  }, [src]);

  async function handleError() {
    // 이미 시도했거나 reelId 없으면 복구 불가 → 대체 UI 고정 (무한루프 차단)
    if (triedRecovery || !reelId) {
      setFailed(true);
      return;
    }
    setTriedRecovery(true);
    setFailed(true); // 복구 동안 대체 UI 표시
    try {
      const { thumbnail } = await refreshThumbnail(reelId);
      if (thumbnail) {
        // 같은 URL로 재캐시될 수도 있으니 캐시버스트로 강제 재로드
        const busted = thumbnail + (thumbnail.includes("?") ? "&" : "?") + "v=" + Date.now();
        setCurrentSrc(busted);
        setFailed(false);
      }
      // thumbnail이 null이면 failed=true 유지 (영구 실패)
    } catch {
      // 네트워크 등 실패 → 대체 UI 유지
    }
  }

  if (!currentSrc || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-700/90 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <span className={iconClassName}>🎬</span>
        </div>
        {fallbackLabel ? (
          <p className="max-w-[11rem] whitespace-pre-line text-xs leading-relaxed text-gray-300">
            {fallbackLabel}
          </p>
        ) : (
          <p className="text-xs text-gray-300">썸네일이 없습니다</p>
        )}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
```

- [ ] **Step 2: 타입/린트 검증**

Run: `npm run lint && npm run build`
Expected: 통과.

---

## Task 4: 호출부에 `reelId` 전달

**Files:**
- Modify: `src/components/reel-card.tsx` (45-51행 `ReelThumbnail` 사용부)
- Modify: `src/app/(main)/reels/[id]/page.tsx` (상세 페이지 `ReelThumbnail` 사용부, 약 101-109행)

- [ ] **Step 1: `reel-card.tsx`에 reelId 추가**

기존:
```tsx
<ReelThumbnail
  src={reel.thumbnail}
  alt=""
  className="absolute inset-0 h-full w-full object-cover"
  loading={priority ? "eager" : "lazy"}
  fetchPriority={priority ? "high" : "low"}
/>
```
변경 (한 줄 추가):
```tsx
<ReelThumbnail
  src={reel.thumbnail}
  reelId={reel.id}
  alt=""
  className="absolute inset-0 h-full w-full object-cover"
  loading={priority ? "eager" : "lazy"}
  fetchPriority={priority ? "high" : "low"}
/>
```

- [ ] **Step 2: `reels/[id]/page.tsx`의 `ReelThumbnail`에도 `reelId={reel.id}` 추가**

해당 `<ReelThumbnail ... />`에 `reelId={reel.id}` prop을 추가 (src 옆). detail 페이지의 reel 변수명이 다르면 그 변수의 id 사용.

- [ ] **Step 3: 타입/린트/빌드 검증**

Run: `npm run lint && npm run build`
Expected: 통과.

---

## Task 5: 통합 수동 검증 (로컬 DB)

**전제:** `supabase start` + `npm run dev` 실행 중, 로컬 DB에 릴이 최소 1개.

- [ ] **Step 1: 깨진 썸네일 시뮬레이션**

로컬 DB에서 한 릴의 thumbnail을 일부러 깨진 URL로 바꾼다 (원래 url은 살아있는 실제 인스타/유튜브 링크여야 재추출이 성공함):
```bash
docker exec supabase_db_reelbox psql -U postgres -d postgres -c \
  "UPDATE \"Reel\" SET thumbnail='https://example.com/broken-404.jpg' WHERE id=(SELECT id FROM \"Reel\" LIMIT 1);"
```

- [ ] **Step 2: 자가복구 확인**

브라우저로 홈(`http://localhost:3000`) 로드 → 그 카드가 처음엔 대체 UI(🎬)였다가 → 잠시 후 **재추출된 썸네일로 자동 교체**되는지 확인. (서버 로그/네트워크 탭에 refreshThumbnail 액션 호출 보임)

- [ ] **Step 3: 영구 실패 확인 (무한루프 없음)**

url 자체가 죽은 릴을 만들어(또는 url을 쓰레기로) 깨진 썸네일을 주면 → 재추출도 실패 → **대체 UI 고정 + 재시도 반복 안 함**(네트워크 탭에 refreshThumbnail이 그 카드당 1번만) 확인.

- [ ] **Step 4: 정리**

검증용으로 변조한 데이터는 릴을 수정/재저장하거나 DB에서 원복.

---

## 마무리 (사용자 요청 시)

- [ ] 브랜치 생성 → 변경 커밋 → PR (과제 3과 동일 방식, base `main`)
- [ ] 설계문서/계획문서 포함 여부 결정 (설계문서는 커밋 안 하기로 했음 — 재확인)

---

## Self-Review (작성자 점검)

- **Spec 커버리지:** 1-A(Task1) ✅ / 1-B 서버(Task2) ✅ / 1-B 클라+1회가드+영구실패(Task3) ✅ / 호출부 reelId(Task4) ✅ / 테스트계획(Task5) ✅. 데이터모델 변경 없음(spec과 일치) ✅. 범위 밖(변경추적·TTL·cron) 미포함 ✅.
- **Placeholder 스캔:** TODO/TBD/"적절히 처리" 없음. 모든 코드 step에 완전한 코드 포함 ✅.
- **타입 일관성:** `refreshThumbnail(reelId): Promise<{ thumbnail: string | null }>` 정의(Task2)와 사용(Task3 `const { thumbnail } = await refreshThumbnail(reelId)`) 일치 ✅. `reelId?: string` prop 정의(Task3)와 전달(Task4) 일치 ✅.

---

## 구현 후 변경점 (as-built)

계획 대비 실제로 추가/변경된 것:

1. **검증 방식 변경**: `lint`/`build` → `npx tsc --noEmit` + 수동 시뮬.
   - `npm run lint` 깨짐: eslint 설정(`eslint.config.*`) 부재 → 별도 PR 예정.
   - `npm run build` 깨짐: **stale Prisma client**(schema엔 `source` 있는데 클라이언트 타입엔 없음) → `npx prisma generate`로 해결(코드 버그 아님).
2. **SSR onError race 보완 (Task 3 추가분)**: SSR `<img>`가 하이드레이션 전 로드 실패 시 onError 누락 → `ref` + `complete/naturalWidth` 마운트 체크로 직접 트리거.
3. **로컬 storage 버킷 (추가)**: 로컬 Supabase에 `reel-thumbnails` 버킷이 없어 캐싱 실패 → `supabase/seed.sql`로 생성(운영 parity).
4. **UI 디자인 (Task 추가분)**: 빈 썸네일 ImageOff + 영역색 구분 / 복구 중 배경 펄스 / 빈 카드 "+ 태그 추가" 힌트 / 하단 패딩 10px.

최종: PR #2 (`feat/thumbnail-resilience` → main).
