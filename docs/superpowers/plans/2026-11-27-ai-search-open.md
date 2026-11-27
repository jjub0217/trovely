# AI 검색 모든 가입자 공개 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 동의한 일반 가입자도 "비슷한 콘텐츠 찾기"를 쓸 수 있게 하고, 철회하면 Trovely에 저장된 AI 검색용 데이터를 바로 지운다.

**Architecture:** 권한 판단은 `canUseAiSearch` 하나로 모은다. 벡터 저장은 동의 상태 줄에 읽기 잠금을 건 조건부 INSERT 한 문장으로 해서, 철회 트랜잭션과 겹쳐도 벡터가 남지 않는다. Gemini 호출은 함수 인자로 바꿔 끼울 수 있게 해서, 로컬 DB에 붙는 확인 스크립트에서 가짜 호출로 순서와 횟수를 검사한다.

**Tech Stack:** Next.js 16 App Router(server actions, `after`), Prisma 7 + raw SQL, Supabase Postgres + pgvector, Gemini `gemini-embedding-001`(768차원), 테스트는 `tsx --test`(node:test).

**Spec:** `docs/superpowers/specs/2026-11-26-ai-search-open-design.md`

## Global Constraints

- 공개 스위치: 서버 전용 환경변수 `AI_SEARCH_PUBLIC`. 값이 `"true"`일 때만 켜짐. 그 밖의 값이나 값이 없으면 꺼짐.
- 상한(상수, `src/lib/ai-search/limits.ts`): 검색어 가입자별 하루 30, 전체 1,000. 게시물 가입자별 하루 3,000, 전체 10,000.
- 날짜는 한국 날짜(`koreaDate`, `src/lib/demo/usage.ts`에 이미 있음).
- 일반 가입자 벡터 글에는 메모, 후기를 넣지 않는다. 관리자 글은 지금과 같다.
- 검색어 원문은 DB에 저장하지 않는다(해시만).
- 관리자는 동의 확인을 건너뛴다. 데모(`DEMO_MODE`)의 흐름은 "누를 때 불러오기" 말고는 그대로 둔다.
- 게시물 벡터 묶음은 100개, 한 번 실행에 200초가 지나면 멈춘다.
- 화면 문구는 설계 문서 7번 그대로. 버튼 문구는 `SIMILAR_MORE_BUTTON`("비슷한 콘텐츠 더 보기"), 개수 표시는 넣지 않는다.
- 새 표는 RLS를 켠다(공개 API 키로 접근 금지).
- 커밋은 작업 브랜치 `feat/ai-search-open`에서 단계마다. push와 PR은 사용자가 요청할 때만.

## Review Focus

1. 동의하지 않은 가입자가 서버 함수(`getSimilarReels`, 설정 화면의 다시 시도)를 직접 부르는 경우: Gemini 호출 0. Task 5, 7의 확인 스크립트에서 고정.
2. 벡터를 만드는 중에 철회하는 경우: 철회가 끝난 뒤 그 사람의 벡터 0. Task 4 확인 스크립트(가짜 Gemini를 늦춤)에서 고정.
3. 같은 검색어를 동시에 여러 번 보내는 경우: Gemini 1번, 사용량 1. Task 5 확인 스크립트에서 고정.
4. 사용량 DB 쿼리가 실패하는 경우: Gemini를 부르지 않고 빈 결과. Task 3, 5에서 고정.
5. 철회 뒤 재동의: 그날 사용량이 그대로이고, 게시물 벡터가 다시 만들어진다. Task 4 확인 스크립트에서 고정.

---

## 파일 구조

| 파일 | 할 일 |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261127090000_ai_search_consent/migration.sql` (새) | 새 표 5개 |
| `src/lib/ai-search/limits.ts` (새) | 상한 상수, 공개 스위치 읽기, 순수 판단 함수 |
| `src/lib/ai-search/usage.ts` (새) | 가입자별, 전체 사용량 차감 |
| `src/lib/ai-search/access.ts` (새) | `canUseAiSearch`, 동의 켜기, 철회, 상태 계산 |
| `src/lib/ai-search/query-vector.ts` (새) | 검색어 벡터 캐시 |
| `src/lib/ai-search/actions.ts` (새) | 설정 화면과 동의 창의 server action |
| `src/lib/search/embedding-text.ts` | 메모, 후기를 빼는 선택값 |
| `src/lib/search/embeddings.ts` | 동의, 작업 버전 확인과 조건부 저장 |
| `src/lib/search/semantic.ts` | 이미 만든 검색어 벡터로 찾기 |
| `src/lib/actions.ts` | `getSimilarReels` 순서 변경 |
| `src/app/(main)/page.tsx`, `src/components/reel-grid.tsx` | 누를 때 불러오기 |
| `src/components/ai-consent-sheet.tsx` (새) | 동의 창 |
| `src/app/(main)/settings/ai/page.tsx` (새), `src/components/ai-search-settings.tsx` (새) | 설정 화면 |
| `src/components/sidebar.tsx`, `src/components/ai-search-notice.tsx` (새) | 메뉴, 공지 띠 |
| `src/lib/account-deletion.ts` | 탈퇴 때 새 표 삭제 |
| `src/lib/privacy-info.ts`, `src/app/(main)/privacy/page.tsx` | 처리방침 AI 항목 |
| `scripts/check-ai-search.ts` (새) | 로컬 DB 확인 스크립트(동시성, 철회, 횟수) |

확인 스크립트 실행: `npx tsx --env-file=.env --env-file=.env.local scripts/check-ai-search.ts` (로컬 Supabase `127.0.0.1:54322`). 스크립트는 시작할 때 `DATABASE_URL`에 `127.0.0.1` 또는 `localhost`가 없으면 바로 멈춘다(운영 DB에서 실행 방지). 시험용 사용자와 게시물은 스크립트가 만들고 끝날 때 지운다.

---

### Task 1: DB 표 5개

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261127090000_ai_search_consent/migration.sql`

**Interfaces:**
- Produces: Prisma 모델 `AiSearchConsent`, `AiSearchConsentLog`, `QueryEmbeddingCache`, `AiUsageUser`, `AiUsageTotal`. 표 이름은 모델 이름 그대로(큰따옴표).

- [ ] **Step 1: 모델 추가**

```prisma
model AiSearchConsent {
  userId        String    @id
  enabled       Boolean
  policyVersion String
  generation    Int       @default(0)
  consentedAt   DateTime?
  revokedAt     DateTime?
}
model AiSearchConsentLog {
  id            String   @id @default(cuid())
  userId        String
  action        String   // "consent" | "revoke"
  policyVersion String
  createdAt     DateTime @default(now())
  @@index([userId])
}
model QueryEmbeddingCache {
  userId    String
  day       String   // 한국 날짜 YYYY-MM-DD
  model     String
  textHash  String
  embedding Unsupported("vector(768)")?
  createdAt DateTime @default(now())
  @@id([userId, day, model, textHash])
}
model AiUsageUser {
  userId String
  day    String
  kind   String // "query" | "document"
  count  Int    @default(0)
  @@id([userId, day, kind])
}
model AiUsageTotal {
  day   String
  kind  String
  count Int    @default(0)
  @@id([day, kind])
}
```

- [ ] **Step 2: migration.sql 작성**

`npx prisma migrate dev --create-only --name ai_search_consent`로 만든 뒤 폴더 이름을 `20261127090000_ai_search_consent`로 맞춘다. 끝에 다섯 표 모두 `ALTER TABLE "<표>" ENABLE ROW LEVEL SECURITY;`를 더한다(기존 이전 파일과 같은 방식인지 `20261124094822_instagram_import_and_embeddings/migration.sql`에서 확인).

- [ ] **Step 3: 로컬 적용과 확인**

Run: `npx prisma migrate dev` 후 `npx prisma migrate status`
Expected: `Database schema is up to date!`

Run: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select relname, relrowsecurity from pg_class where relname like 'Ai%' or relname = 'QueryEmbeddingCache'"`
Expected: 5줄, 모두 `t`

- [ ] **Step 4: 커밋** `feat: AI 검색 동의, 사용량, 검색어 캐시 표 추가`

---

### Task 2: 순수 함수(상한, 공개 스위치, 벡터 글)

**Files:**
- Create: `src/lib/ai-search/limits.ts`, `src/lib/ai-search/limits.test.ts`
- Modify: `src/lib/search/embedding-text.ts`, `src/lib/search/embedding-text.test.ts`

**Interfaces:**
- Produces:
  - `type AiUsageKind = "query" | "document"`
  - `AI_LIMITS: Record<AiUsageKind, { perUser: number; total: number }>` = `{ query: { perUser: 30, total: 1000 }, document: { perUser: 3000, total: 10000 } }`
  - `isAiSearchPublic(): boolean` (`process.env.AI_SEARCH_PUBLIC === "true"`)
  - `decideAiAccess(input: { isAdmin: boolean; isPublic: boolean; consentEnabled: boolean }): boolean`
  - `AI_SEARCH_POLICY_VERSION = "2026-11-27"` (처리방침을 개정해 시행일이 정해지면 같은 날짜로 바꾼다)
  - `buildEmbeddingText(r: EmbeddingSource, options?: { includePrivateNotes?: boolean }): string` 기본값 `true`(관리자 지금과 같음)

- [ ] **Step 1: 실패하는 테스트**

```ts
test("decideAiAccess: 관리자는 늘 허용, 일반은 공개+동의일 때만", () => {
  assert.equal(decideAiAccess({ isAdmin: true, isPublic: false, consentEnabled: false }), true);
  assert.equal(decideAiAccess({ isAdmin: false, isPublic: true, consentEnabled: true }), true);
  assert.equal(decideAiAccess({ isAdmin: false, isPublic: false, consentEnabled: true }), false);
  assert.equal(decideAiAccess({ isAdmin: false, isPublic: true, consentEnabled: false }), false);
});
test("isAiSearchPublic: 'true'일 때만 켜짐", () => { /* undefined, "1", "TRUE", "true" → false,false,false,true */ });
test("AI_LIMITS: 설계 문서의 숫자", () => {
  assert.deepEqual(AI_LIMITS, { query: { perUser: 30, total: 1000 }, document: { perUser: 3000, total: 10000 } });
});
// embedding-text.test.ts
test("includePrivateNotes false면 메모와 후기를 빼고 해시도 달라진다", () => {
  const r = { ...base, memo: "비밀 메모", review: "후기" };
  const t = buildEmbeddingText(r, { includePrivateNotes: false });
  assert.ok(!t.includes("비밀 메모") && !t.includes("후기:"));
  assert.notEqual(hashText(t), hashText(buildEmbeddingText(r)));
});
```

- [ ] **Step 2:** `npm test` → 새 테스트 실패(없는 함수)
- [ ] **Step 3:** 구현
- [ ] **Step 4:** `npm test` → 전체 통과(기존 96개 + 새 테스트)
- [ ] **Step 5: 커밋** `feat: AI 검색 권한 판단, 상한, 메모와 후기 뺀 벡터 글`

---

### Task 3: 사용량 차감

**Files:**
- Create: `src/lib/ai-search/usage.ts`
- Create: `scripts/check-ai-search.ts` (이 Task에서 뼈대와 사용량 확인부터)

**Interfaces:**
- Consumes: `AI_LIMITS`, `AiUsageKind`, `koreaDate`
- Produces: `consumeAiQuota(userId: string, kind: AiUsageKind, amount: number, options?: { now?: Date; db?: Pick<PrismaClient, "$transaction"> }): Promise<number>` = 실제로 허락된 개수(0..amount). DB 오류면 0을 돌려주고 로그만 남긴다. `db` 기본값은 `prisma`(시험에서 실패하는 가짜를 넣으려고 둔다).

- [ ] **Step 1: 확인 스크립트에 사용량 검사를 먼저 쓴다**

스크립트 구조: `check(name, fn)`으로 이름을 출력하고 실패하면 `process.exitCode = 1`. 시작할 때 로컬 주소 검사, 끝날 때 시험 데이터 삭제.
- `query 상한 30: 동시에 40번 consumeAiQuota(u, "query", 1) → 합계 30`
- `전체 상한: AiUsageTotal을 999로 넣어 두고 두 사용자가 동시에 1씩 → 합계 1`
- `document 부분 허락: perUser 남은 양이 5일 때 amount 100 → 5`
- `사용량 DB 오류: $transaction이 늘 예외를 던지는 가짜 db를 넘김 → 0, 예외가 밖으로 나오지 않음`

- [ ] **Step 2:** 스크립트 실행 → `consumeAiQuota` 없음으로 실패
- [ ] **Step 3: 구현**

한 트랜잭션 안에서 가입자별 줄과 전체 줄을 각각 "남은 양만큼만 올리기"로 처리한다. 순서는 늘 가입자별 → 전체(잠금 순서를 고정해 교착을 막는다). 허락량 = min(amount, 가입자별 남은 양, 전체 남은 양). 둘 중 작은 쪽에 맞춰 두 줄을 같은 양만큼 올린다:

```sql
-- 1) 두 줄을 만들어 두고 잠근다
INSERT INTO "AiUsageUser" ("userId","day","kind","count") VALUES ($1,$2,$3,0) ON CONFLICT DO NOTHING;
INSERT INTO "AiUsageTotal" ("day","kind","count") VALUES ($2,$3,0) ON CONFLICT DO NOTHING;
SELECT "count" FROM "AiUsageUser" WHERE ... FOR UPDATE;
SELECT "count" FROM "AiUsageTotal" WHERE ... FOR UPDATE;
-- 2) 허락량을 계산해 두 줄에 더한다
```

- [ ] **Step 4:** 스크립트 실행 → 사용량 검사 모두 통과. `npm test`, `npx tsc --noEmit` 통과
- [ ] **Step 5: 커밋** `feat: AI 검색 가입자별, 전체 하루 사용량 차감`

---

### Task 4: 동의, 철회, 게시물 벡터 저장

**Files:**
- Create: `src/lib/ai-search/access.ts`
- Modify: `src/lib/search/embeddings.ts`, `scripts/check-ai-search.ts`

**Interfaces:**
- Consumes: `decideAiAccess`, `isAiSearchPublic`, `AI_SEARCH_POLICY_VERSION`, `consumeAiQuota`, `buildEmbeddingText(…, { includePrivateNotes })`
- Produces:
  - `canUseAiSearch(userId: string): Promise<boolean>`
  - `enableAiSearch(userId: string, input: { adultConfirmed: boolean; policyVersion: string }): Promise<{ ok: true } | { error: string }>` 성인 확인이 거짓이거나 버전이 `AI_SEARCH_POLICY_VERSION`과 다르면 오류
  - `revokeAiSearch(userId: string, options?: { beforeCommit?: (tx: Prisma.TransactionClient) => Promise<void> }): Promise<{ ok: true } | { error: string }>` (`beforeCommit`은 시험에서 삭제 뒤 일부러 실패시키려고 둔다)
  - `getAiSearchStatus(userId: string): Promise<{ enabled: boolean; total: number; pending: number }>` pending = 벡터가 없거나 해시가 다른 게시물 수(일반 가입자 글 기준)
  - `type EmbedFn = (texts: string[]) => Promise<number[][]>`
  - `upsertReelEmbeddings(reelIds: string[], options?: { embed?: EmbedFn; deadlineMs?: number }): Promise<{ updated: number; skipped: number; stopped?: "revoked" | "quota" | "deadline" }>` 기본 embed = `embedTexts(texts, "RETRIEVAL_DOCUMENT")`

- [ ] **Step 1: 확인 스크립트에 검사 추가**

가짜 embed는 호출 수와 받은 글을 기록하고, 768개짜리 고정 벡터를 돌려준다. 늦추는 가짜는 `await` 할 수 있는 신호를 받아 그때까지 기다린다.
- `동의 안 함: upsertReelEmbeddings → embed 0번, ReelEmbedding 0줄`
- `동의 함: 메모, 후기가 받은 글에 없음, 벡터 수 = 게시물 수`
- `생성 중 철회: 늦추는 가짜로 embed 안에서 멈춤 → revokeAiSearch 시작 → 가짜 풀어 줌 → 둘 다 끝난 뒤 ReelEmbedding 0줄, stopped 또는 저장 0`
- `철회 뒤 재동의: 벡터 다시 생성, 그날 AiUsageUser document 개수는 줄지 않음`
- `다시 시도: 하나만 글을 바꾼 뒤 실행 → embed가 받은 글 1개`
- `상한: perUser 남은 양 2, 게시물 5 → 저장 2, stopped "quota"`
- `철회 실패 되돌림: beforeCommit에서 예외 → { error } 반환, 동의 상태는 켜진 그대로, ReelEmbedding 줄 수 그대로`
- `관리자: 동의 줄 없이도 메모 포함 벡터 생성(지금과 같음)`

- [ ] **Step 2:** 실행 → 실패 확인
- [ ] **Step 3: 구현**

`enableAiSearch`, `revokeAiSearch`는 `prisma.$transaction` 하나. 철회는 `SELECT … FROM "AiSearchConsent" WHERE "userId"=$1 FOR UPDATE` → `enabled=false, generation=generation+1, revokedAt=now()` → `DELETE FROM "ReelEmbedding" WHERE "reelId" IN (SELECT id FROM "Reel" WHERE "userId"=$1)` → `DELETE FROM "QueryEmbeddingCache" WHERE "userId"=$1` → 이력. 켜기도 `generation+1`.

`upsertReelEmbeddings` 바뀌는 부분:
- `filterAdminOwned`로 거르던 것을 주인별로 나눈다: 관리자 주인 → 지금 흐름(메모, 후기 포함, 확인 없음). 일반 주인 → `canUseAiSearch`가 참인 주인만, 그때의 `generation`을 기억.
- 일반 주인 묶음은 100개씩: Gemini 전 `consumeAiQuota(owner, "document", n)` → 허락량만큼만 보냄. 보내기 직전 `generation`과 `enabled` 재확인.
- 저장(일반 주인):

```sql
INSERT INTO "ReelEmbedding" ("reelId","embedding","textHash","updatedAt")
SELECT $reelId, $vec::vector, $hash, now()
WHERE EXISTS (
  SELECT 1 FROM "AiSearchConsent"
  WHERE "userId" = $owner AND "enabled" AND "generation" = $gen
  FOR SHARE)
ON CONFLICT ("reelId") DO UPDATE SET "embedding"=EXCLUDED."embedding","textHash"=EXCLUDED."textHash","updatedAt"=now()
```
  영향받은 줄이 0이면 그 주인 처리를 `stopped: "revoked"`로 끝낸다.
- 줄마다 따로 실행하고 하나가 실패해도(외래키 등) 로그만 남기고 계속한다.
- `deadlineMs`(기본 200000)를 넘으면 `stopped: "deadline"`.
- `filterAdminOwned`는 더 쓰지 않으면 지우고 그 테스트도 정리한다.

- [ ] **Step 4:** 스크립트 통과, `npm test`, `npx tsc --noEmit` 통과
- [ ] **Step 5: 커밋** `feat: AI 검색 동의, 철회와 동의한 가입자의 게시물 벡터 저장`

---

### Task 5: 검색어 벡터 캐시와 getSimilarReels

**Files:**
- Create: `src/lib/ai-search/query-vector.ts`
- Modify: `src/lib/search/semantic.ts`, `src/lib/actions.ts:267-310`, `scripts/check-ai-search.ts`

**Interfaces:**
- Consumes: `canUseAiSearch`, `consumeAiQuota`, `hashText`, `koreaDate`, `EMBEDDING_MODEL`
- Produces:
  - `getQueryVector(userId: string, query: string, options?: { embed?: EmbedFn; now?: Date; waitMs?: number }): Promise<{ vector: number[] } | { limited: true } | { unavailable: true }>` waitMs 기본 3000
  - `semanticReelIdsByVector(userId: string, vector: number[], filter?: SemanticFilter, take?: number): Promise<string[]>` (기존 `semanticReelIds`는 이 함수를 쓰게 바꾸고 이름과 동작은 유지: 관리자 AI에게 물어보기가 계속 쓴다)
  - `getSimilarReels(...)` 반환형에 `needsConsent?: boolean` 추가

- [ ] **Step 1: 확인 스크립트에 검사 추가**
- `같은 검색어 동시 5번 → embed 1번, AiUsageUser query 1, 다섯 결과 모두 같은 벡터`
- `다른 사람 같은 검색어 → 캐시 따로(embed 2번째 호출)`
- `캐시 줄에 검색어 원문 없음: 표 전체를 글자로 바꿔 검색어 문자열이 안 나옴`
- `embed 실패 → "만드는 중" 줄이 지워져 다음 요청이 다시 만든다`
- `상한 30 소진 뒤 → { limited: true }, embed 호출 없음`
- `지난 날짜 줄은 그 사람 검색 때 지워짐`
- `남의 게시물 안 나옴: 다른 사용자 게시물에 같은 벡터를 넣어도 결과에 없음`
- `카테고리 두 개 + 출처 필터: 조건을 모두 가진 게시물만`

- [ ] **Step 2:** 실행 → 실패 확인
- [ ] **Step 3: 구현**

`getQueryVector` 순서: 그 사람의 지난 날짜 줄 삭제 → 오늘 줄 조회(벡터 있으면 바로 반환) → `INSERT … ON CONFLICT DO NOTHING`으로 빈 줄 넣기 → 넣은 요청만 `consumeAiQuota(userId,"query",1)`(0이면 줄 지우고 `limited`) → embed(`retries: 0, timeoutMs: 3000`) → 벡터 저장. 실패하면 줄 삭제 후 `unavailable`. 못 넣은 요청은 200ms 간격으로 `waitMs`까지 벡터를 기다리고, 없으면 `unavailable`.

`getSimilarReels`의 일반 경로: `requireAuth` → `canUseAiSearch` 거짓이면 `{ items: [], needsConsent: isAiSearchPublic() }` → `getQueryVector` → `limited`면 `{ items: [], limited: true }`, `unavailable`이면 `{ items: [] }` → `semanticReelIdsByVector` → 지금처럼 키워드 결과와 겹치는 것을 빼고 카드 모양으로. 관리자는 `getQueryVector`를 거치지 않고 지금처럼(관리자 사용량은 세지 않음). 데모 분기는 그대로.

- [ ] **Step 4:** 스크립트 통과, `npm test`, `npx tsc --noEmit`, `npm run lint` 통과
- [ ] **Step 5: 커밋** `feat: 동의한 가입자의 비슷한 콘텐츠 찾기와 검색어 벡터 재사용`

---

### Task 6: 누를 때 불러오기와 동의 창

**Files:**
- Modify: `src/app/(main)/page.tsx`, `src/components/reel-grid.tsx`, `src/lib/search/labels.ts`
- Create: `src/components/ai-consent-sheet.tsx`, `src/lib/ai-search/actions.ts`

**Interfaces:**
- Consumes: `getSimilarReels`, `enableAiSearch`, `AI_SEARCH_POLICY_VERSION`
- Produces:
  - server action `enableAiSearchAction(input: { adultConfirmed: boolean; policyVersion: string }): Promise<{ ok: true } | { error: string }>` (성공하면 `after`로 그 사람 게시물 전체 `upsertReelEmbeddings`)
  - `ReelGrid` props: `similarReels`(키워드 결과 0개일 때만 서버가 채움), `similarLimited`, `similarNeedsConsent?: boolean`, `canLoadSimilar: boolean`
  - `canLoadSimilar` = 검색어가 있고 (`DEMO_MODE` 또는 관리자 또는 `isAiSearchPublic()`). 공개 전에는 일반 가입자에게 버튼이 아예 안 보인다(설계 8번 1단계: 일반 가입자 화면은 그대로).
  - `AiConsentSheet` props: `{ open: boolean; onClose(): void; onEnabled(): void }`

- [ ] **Step 1: page.tsx**

키워드 결과를 먼저 받고, 결과가 0개이고 검색어가 있을 때만 `loadSimilar()`를 부른다(`Promise.all`에서 빼서 순서대로). 결과가 있으면 비슷한 콘텐츠는 부르지 않는다.

- [ ] **Step 2: reel-grid.tsx**

키워드 결과가 있고 `!cursor`이면 버튼을 보여 준다(개수 없음). 누르면 `getSimilarReels`를 클라이언트에서 부르고 "찾는 중" 표시 → 결과를 펼친다. 응답이 `needsConsent`면 동의 창을 연다. 동의 성공 시 다시 불러온다(벡터가 아직 없으면 빈 결과일 수 있으니, 빈 결과면 "AI 검색을 준비하고 있어요. 잠시 뒤 다시 눌러 주세요."). 결과 0개면 "비슷한 콘텐츠가 없습니다". 키워드 결과 0개 + `similarNeedsConsent`면 "조건에 맞는 콘텐츠가 없습니다" 아래에 같은 버튼. 새 검색이면 상태 초기화(지금 `prevInitialReels` 방식).

새 문구는 `labels.ts`에 상수로: `SIMILAR_LOADING = "찾는 중..."`, `SIMILAR_EMPTY = "비슷한 콘텐츠가 없습니다"`, `SIMILAR_PREPARING = "AI 검색을 준비하고 있어요. 잠시 뒤 다시 눌러 주세요."`

- [ ] **Step 3: ai-consent-sheet.tsx**

`ask-shell.tsx`의 아래 창 모양을 따른다. 문구는 설계 문서 7번 그대로. 체크박스를 켜야 "동의하고 사용하기"가 눌린다. 서버 오류는 창 안에 보여 준다. 처리방침 링크(`/privacy`) 포함.

- [ ] **Step 4: 확인**

`npx tsc --noEmit`, `npm run lint`, `npm test` 통과. 로컬 dev 서버에서 사용자 확인(관리자 계정, 일반 시험 계정 각각): 버튼에 개수 없음, 누르면 결과, 동의 창 흐름. `AI_SEARCH_PUBLIC`이 없는 상태에서 일반 계정은 버튼이 안 보이는지, `AI_SEARCH_PUBLIC=true`에서는 버튼을 누르면 동의 창이 뜨는지. 데모 모드(`npm run dev` + `DEMO_MODE`)에서도 버튼이 같게 동작.

- [ ] **Step 5: 커밋** `feat: 비슷한 콘텐츠를 버튼을 누를 때 불러오고 동의 창 추가`

---

### Task 7: 설정 화면, 메뉴, 공지 띠

**Files:**
- Create: `src/app/(main)/settings/ai/page.tsx`, `src/components/ai-search-settings.tsx`, `src/components/ai-search-notice.tsx`
- Modify: `src/lib/ai-search/actions.ts`, `src/components/sidebar.tsx`, `src/app/(main)/page.tsx`(공지 띠 자리), `scripts/check-ai-search.ts`

**Interfaces:**
- Consumes: `getAiSearchStatus`, `revokeAiSearch`, `enableAiSearchAction`, `isAiSearchPublic`
- Produces: server actions `revokeAiSearchAction(): Promise<{ ok: true } | { error: string }>`, `retryAiSearchAction(): Promise<{ ok: true } | { error: string }>`(동의한 사람만, `after`로 남은 게시물 처리)

- [ ] **Step 1: 확인 스크립트에 검사 추가**

`retry 내부 함수(동의 안 함) → embed 0번`. server action 자체는 로그인 쿠키가 필요해서 스크립트에서 부르지 않고, action이 부르는 내부 함수(`canUseAiSearch` 확인 후 `upsertReelEmbeddings`)를 검사한다.

- [ ] **Step 2: 구현**

- 설정 화면: 공개 스위치가 꺼져 있고 관리자가 아니면 `/`로 보낸다. 스위치(켜기는 동의 창을 연다, 끄기는 확인 문구 "AI 검색을 끄면 Trovely에 저장된 AI 검색용 데이터가 바로 삭제돼요." 후 철회), 상태 한 줄(`pending > 0`이면 "준비 중: N개 남음 · 다시 시도", 0이면 "준비 완료"), 처리방침 링크.
- 사이드바: `isAiSearchPublic()`일 때만 "AI 검색 설정"(`/settings/ai`, lucide `Sparkles`) 메뉴. 값은 서버에서 props로 내려준다.
- 공지 띠: 공개 전 7일 동안 보여야 해서 공개 스위치와 따로 서버 전용 환경변수 `AI_SEARCH_NOTICE`(`"true"`일 때)로 켠다(설계에 없던 값, 계획에서 정함). 문구: "AI 검색이 곧 열려요. 개인정보 처리방침이 바뀌어요. 자세히 보기" (링크 `/privacy`). 닫으면 `localStorage`에 기록(try/catch).

- [ ] **Step 3: 확인** tsc, lint, test 통과. 로컬에서 사용자 확인: 켜기 → 상태 "준비 중" → 잠시 뒤 "준비 완료", 끄기 → DB의 그 사람 `ReelEmbedding`, `QueryEmbeddingCache` 0줄(psql로 보여 줌).
- [ ] **Step 4: 커밋** `feat: AI 검색 설정 화면, 사이드바 메뉴, 공지 띠`

---

### Task 8: 탈퇴와 처리방침

**Files:**
- Modify: `src/lib/account-deletion.ts`, `src/lib/privacy-info.ts`, `src/app/(main)/privacy/page.tsx`, `scripts/check-ai-search.ts`

**Interfaces:**
- Consumes: Task 1 모델

- [ ] **Step 1: 확인 스크립트에 검사 추가**

`탈퇴 트랜잭션 안의 삭제 부분`을 함수로 빼서(`deleteAiSearchData(tx, userId)`, `access.ts`) 검사: 실행 뒤 그 사람의 `AiSearchConsent`, `AiSearchConsentLog`, `QueryEmbeddingCache`, `AiUsageUser` 0줄, `AiUsageTotal`은 그대로.

- [ ] **Step 2: 구현**

`deleteAccountData` 트랜잭션에서 `importBatch` 삭제 다음에 `deleteAiSearchData(tx, userId)`.

처리방침: `privacy-info.ts`에 `aiSearch` 항목(받는 자 "Google LLC"는 **임시 값**, 주석에 "결제 계정의 계약 법인 확인 뒤 교체" 표시; 항목, 국가, 시기와 방법, 목적, 보유 기간 55일, 거부 방법). `privacy/page.tsx`의 처리 위탁과 국외 이전 부분에 AI 검색(선택 기능, 동의한 경우만) 문단 추가. **시행일은 바꾸지 않는다**(공개 순서 3단계에서 사용자 확인 뒤 바꾼다).

- [ ] **Step 3: 확인** 스크립트, tsc, lint, test 통과. `/privacy` 화면 사용자 확인.
- [ ] **Step 4: 커밋** `feat: 탈퇴 때 AI 검색 데이터 삭제, 처리방침에 AI 검색 항목 초안`

---

### Task 9: 마무리 확인

- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과
- [ ] `scripts/check-ai-search.ts` 전체 통과(출력 그대로 보고)
- [ ] 관리자 측정 질문(`scripts/measure-search.ts`)이 지금과 같은 결과인지
- [ ] 로컬에서 Gemini 키 없이(`GEMINI_API_KEY=` 비움) 일반 시험 계정으로 저장, 수정, 검색 → 오류 없이 키워드 결과만(Gemini를 부르면 키 없음 오류가 로그에 남는다. 로그에 없음을 보여 줌)
- [ ] 블로그 작업 기록(`~/Desktop/blog-drafts/blog-draft-trovely-rag.md` 작업 기록 칸)에 한 줄씩 추가
- [ ] 사용자에게 push와 PR 여부를 묻는다. 운영 DB 이전과 환경변수는 사용자가 한다.
