# 인스타그램 저장 게시물 가져오기 + 뜻으로 찾기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인스타그램 내보내기 파일로 저장 게시물 2,831개를 캡션과 함께 Trovely로 가져오고(관리자 본인 전용, 묶음별 검토), 캡션 기반 뜻 검색을 붙여 단어 검색과 비교 측정한 뒤, 검색창 질문에 AI가 저장한 릴스로 답하는 RAG 생성 단계까지 잇는다.

**Architecture:** 내보내기 파싱과 분류 규칙은 순수 함수(`src/lib/instagram-import/`)로 두고 테스트한다. 가져오기는 임시 표(`ImportBatch`, `ImportCandidate`)에 쌓아 두고, AI 제안은 서버 액션을 여러 번 불러 조금씩 채운 뒤(이어 하기 가능), 관리자 화면에서 묶음별로 검토해 `Reel`로 저장한다. 뜻 검색은 pgvector 표(`ReelEmbedding`)와 Gemini 임베딩으로, 카테고리 필터 안에서 가까운 순 상위 20개를 돌려준다.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7(+ raw SQL for pgvector), PostgreSQL(로컬 Docker Supabase), Gemini REST API(fetch, 새 SDK 의존성 없음), Node 내장 테스트 러너(`tsx --test`).

**Spec:** `docs/superpowers/specs/2026-11-24-instagram-import-and-semantic-search-design.md`

## Global Constraints

- 로컬 Docker Supabase에서만 개발, 측정한다. `.env`의 `DATABASE_URL`은 로컬 주소. 운영 DB 마이그레이션과 실제 가져오기는 이 계획 범위 밖(측정 뒤 사용자 확인).
- 커밋, 푸시, 머지는 사용자가 요청할 때만. 각 Task 끝의 "커밋" 단계는 사용자에게 커밋 여부를 물어보는 단계로 바꿔 실행한다.
- 작업 브랜치: 최신 `origin/main`에서 `feat/instagram-import-search`.
- 가져오기 관련 서버 액션과 화면은 관리자(`AdminRole`) 계정만. `DEMO_MODE`에서는 모두 막는다.
- 작은 컬렉션 기준: `SMALL_COLLECTION_THRESHOLD = 10`(게시물 10개 이상이면 그대로 카테고리, 10개 미만이면 AI).
- 뜻 검색 결과: 카테고리 필터 안에서 가까운 순 상위 20개, 자르는 기준 없음. 뜻 검색 모드에서는 정렬 메뉴와 이어 불러오기를 끈다. 화면 표시 문구: `뜻으로 찾은 결과(가까운 순)`.
- 측정 기준: 정답이 상위 5개 안에 든 비율(주), 상위 5개에 섞인 엉뚱한 게시물 수(보조).
- AI 답(Task 11): 관리자 계정에서 엔터를 눌렀을 때만. AI에게 건네는 릴스 `ANSWER_CONTEXT_SIZE = 5`, 목록 20개. 화면 문구는 설계 5-6을 그대로 쓴다.
- 비밀값(`GEMINI_API_KEY`)은 `.env.local`과 Vercel 환경변수에만. 화면이나 로그에 출력하지 않는다. `.env.example`에는 키 이름만.
- 사용자의 내보내기 파일은 저장소에 넣지 않는다. 로컬 사본 위치: `~/trovely-import/`(저장소 밖).
- 기술 블로그: 각 Task 끝에 `~/Desktop/blog-drafts/blog-draft-trovely-rag.md`의 "작업 로그"에 날짜와 한 줄(무엇을 했고 무엇을 알게 됐는지)을 덧붙인다. 큰 단계(Task 6, 9, 11, 12) 뒤에는 백그라운드 에이전트가 로그를 바탕으로 본문을 정리한다.

## Review Focus

1. 같은 내보내기 파일을 두 번 올림 → 이미 Trovely에 있거나 이미 대기 중인 주소는 다시 만들지 않는다(Task 2, 5 테스트).
2. 이모지와 여러 줄, 여러 캡션이 섞인 글자 깨짐 문자열 → 정확히 되돌린다(Task 1 테스트).
3. AI 제안 도중 Gemini 요청 한도(429)나 시간 초과 → 처리 못 한 후보는 그대로 남고, 다시 누르면 이어서 한다(Task 5 테스트, Task 4 재시도).
4. 가져온 뒤 메모, 태그, 카테고리를 고침 → 벡터를 다시 만든다(Task 8 테스트: 임베딩 글이 바뀌면 해시가 바뀜).
5. 관리자가 아니거나 데모 모드에서 가져오기 액션 호출 → 막는다(Task 5 수동 확인 단계).
6. AI 답이 건네지 않은 릴스 id를 돌려주거나 아무 id도 없이 그럴듯한 답을 씀 → 버리거나 "찾지 못했어요"로 바꾼다(Task 11 테스트).
7. 질문에서 낱말 칩이 하나도 안 나옴, 또는 칩을 모두 ×로 뺌 → 질문 문장 전체로 찾는다(Task 11 테스트).

---

## 파일 구조

- `src/lib/instagram-import/parse-export.ts` — 내보내기 JSON 파싱, 글자 깨짐 되돌리기
- `src/lib/instagram-import/plan-import.ts` — 분류 규칙(그대로 옮길 컬렉션, AI가 맡을 게시물, 중복 제외)
- `src/lib/instagram-import/suggest.ts` — AI 제안 요청과 응답 검증
- `src/lib/instagram-import/actions.ts` — 가져오기 서버 액션(관리자 전용)
- `src/lib/ai/gemini.ts` — Gemini REST 호출(임베딩, JSON 생성), 재시도
- `src/lib/search/embedding-text.ts` — 벡터로 바꿀 글 만들기, 해시
- `src/lib/search/embeddings.ts` — 벡터 저장과 갱신
- `src/lib/search/semantic.ts` — 뜻 검색 쿼리
- `src/lib/caption.ts` — 새로 저장할 때 캡션 뽑기(microlink, oEmbed 응답 정리)
- `src/app/admin/import/` — 가져오기 화면(업로드, 진행, 묶음 목록, 묶음 상세)
- `src/components/search-bar.tsx`, `src/app/(main)/page.tsx` — 단어/뜻 검색 전환
- `src/components/reel-thumbnail.tsx` — 썸네일이 비어 있을 때 받아 오기
- `prisma/schema.prisma` + 새 마이그레이션
- `scripts/backfill-embeddings.ts`, `scripts/measure-search.ts`, `docs/search-eval/queries.json`
- `src/lib/search/ask.ts` — 질문 읽기, 답 쓰기 프롬프트와 응답 검증(순수 함수) / `src/lib/search/ask-actions.ts` — AI 답 서버 액션
- `src/components/ask-answer.tsx` — 조건 칩과 답 상자

---

### Task 0: 브랜치와 테스트 실행 준비

**Files:**
- Modify: `package.json` (scripts에 `"test": "tsx --test \"src/**/*.test.ts\""`)
- Modify: `.env.example` (`GEMINI_API_KEY=` 줄 추가)

- [ ] **Step 1:** `git fetch origin && git switch -c feat/instagram-import-search origin/main`. 시작 전에 `git status`로 다른 브랜치의 커밋하지 않은 파일(지금 `docs/superpowers/` 아래 문서들)이 따라오는지 확인하고, 따라오면 그대로 둔다(문서만이라 문제없음).
- [ ] **Step 2:** `npm install` (node_modules가 없음). 이어서 `npx prisma generate`.
- [ ] **Step 3:** 위 `test` 스크립트와 `.env.example` 줄을 더한다.
- [ ] **Step 4:** `npm test` 실행. Expected: 테스트 파일이 없어 0개 통과로 끝나거나 "no test files" 안내. `npx tsc --noEmit` Expected: 에러 0.
- [ ] **Step 5:** 블로그 작업 로그 한 줄(브랜치, 테스트 러너를 새 의존성 없이 Node 내장으로 정한 이유). 사용자에게 커밋 여부 확인.

### Task 1: 내보내기 파일 파싱

**Files:**
- Create: `src/lib/instagram-import/parse-export.ts`
- Test: `src/lib/instagram-import/parse-export.test.ts`

**Interfaces:**
- Produces:
  - `fixMojibake(s: string): string` — `Buffer.from(s, "latin1").toString("utf8")`. 이미 정상 한글이면(코드포인트 > 0xFF가 있으면) 그대로 돌려준다.
  - `type ExportPost = { url: string; caption: string; savedAt: Date }`
  - `parseSavedPosts(json: unknown): ExportPost[]`
  - `type ExportCollection = { name: string; urls: string[] }`
  - `parseCollections(json: unknown): ExportCollection[]`
  - URL은 `normalizeReelUrl`(`src/lib/reel-url.ts`)로 정규화한다. 정규화에 실패한 항목은 버리고 개수를 셀 수 있게 `parseSavedPosts`가 아닌 별도 반환이 필요하면 `{ posts, skipped }`로 바꿔도 된다(구현자 판단, 바꾸면 이 블록을 고친다).

- [ ] **Step 1: 실패하는 테스트 작성** — 실제 파일 모양을 흉내 낸 작은 JSON을 테스트 안에서 만든다. 깨진 문자열은 `Buffer.from("한글", "utf8").toString("latin1")`로 만든다.
  - `fixMojibake` 가 `"제목"`, `"🍝파스타\n줄바꿈"`(4바이트 이모지 포함)을 되돌린다.
  - `fixMojibake("이미 정상")` 은 그대로.
  - `parseSavedPosts`: 라벨 `캡션`(깨진 형태)과 `URL`이 있는 항목 → `{ url: "https://www.instagram.com/reel/ABC/"를 정규화한 값, caption: "되돌린 캡션", savedAt: new Date(timestamp*1000) }`.
  - 캡션이 둘인 항목 → 두 캡션을 `"\n\n"`으로 이어 붙인다.
  - 캡션이 없는 항목 → `caption: ""`.
  - `parseCollections`: 이름 `"데이트"`(깨진 형태)와 게시물 두 개 → `{ name: "데이트", urls: [정규화된 두 주소] }`, 게시물 0개 컬렉션도 `urls: []`로 돌려준다.
- [ ] **Step 2:** `npm test` → FAIL(모듈 없음).
- [ ] **Step 3:** 구현. 라벨 비교는 `fixMojibake(label)`로 한다. 라벨 없는(`label`이 없고 `dict`가 있는) 묶음 안에서 컬렉션 게시물을 찾는다.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** 사용자 파일로 확인하는 일회성 확인: `npx tsx -e` 로 `~/trovely-import/saved_posts.json` 파싱 → 2,831개, 캡션 빈 것 16개, 컬렉션 61개, 컬렉션에 든 고유 주소 2,799개가 나오는지 본다(설계 문서 3장 수치).
- [ ] **Step 6:** 블로그 로그 한 줄. 커밋 여부 확인.

### Task 2: 분류 계획(그대로 옮길 것과 AI가 맡을 것)

**Files:**
- Create: `src/lib/instagram-import/plan-import.ts`
- Test: `src/lib/instagram-import/plan-import.test.ts`

**Interfaces:**
- Consumes: `ExportPost`, `ExportCollection` (Task 1)
- Produces:
  - `export const SMALL_COLLECTION_THRESHOLD = 10`
  - `type PlannedItem = { url: string; caption: string; savedAt: Date; keptCategories: string[]; needsAi: boolean; fromCollections: string[] }`
  - `planImport(input: { posts: ExportPost[]; collections: ExportCollection[]; existingUrls: Set<string>; threshold?: number }): { items: PlannedItem[]; skippedExisting: number; droppedEmptyCollections: string[] }`

규칙(설계 5-2): 게시물 수가 `threshold` 이상인 컬렉션의 이름은 `keptCategories`에 들어간다. 하나라도 큰 컬렉션에 속한 게시물은 `needsAi: false`(작은 컬렉션 소속은 버리지 않고 `fromCollections`에 남겨 AI 태그 제안 참고용으로 쓴다). 큰 컬렉션에 하나도 속하지 않은 게시물(작은 컬렉션만, 또는 컬렉션 밖)은 `needsAi: true`. `existingUrls`에 있는 주소는 결과에서 빼고 `skippedExisting`으로 센다. 빈 컬렉션 이름은 `droppedEmptyCollections`.

- [ ] **Step 1: 실패하는 테스트** — 컬렉션 크기 10(큰), 9(작은), 0(빈)을 만든다.
  - 크기 10 컬렉션의 게시물 → `keptCategories: ["그 이름"]`, `needsAi: false`.
  - 크기 9 컬렉션에만 있는 게시물 → `keptCategories: []`, `needsAi: true`, `fromCollections: ["그 이름"]`.
  - 큰 컬렉션과 작은 컬렉션에 동시에 있는 게시물 → `needsAi: false`, `keptCategories`엔 큰 것만.
  - 컬렉션 밖 게시물 → `needsAi: true`, `fromCollections: []`.
  - `existingUrls`에 있는 주소 → 결과에 없음, `skippedExisting: 1`.
  - 빈 컬렉션 → `droppedEmptyCollections`에 이름.
- [ ] **Step 2:** FAIL 확인. **Step 3:** 구현. **Step 4:** PASS 확인.
- [ ] **Step 5:** 사용자 파일로 일회성 확인: 큰 컬렉션 16개, `needsAi: true` 게시물 수(대략 100개 안팎)를 출력해 기록한다.
- [ ] **Step 6:** 블로그 로그 한 줄. 커밋 여부 확인.

### Task 3: DB 변경(캡션, 임시 표, pgvector)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: 새 마이그레이션 폴더(`npx prisma migrate dev --name instagram_import_and_embeddings`)

**Interfaces:**
- Produces(Prisma 모델):
  - `Reel.caption String?`
  - `model ImportBatch { id String @id @default(cuid()); userId String; createdAt DateTime @default(now()); candidates ImportCandidate[] }`
  - `model ImportCandidate { id String @id @default(cuid()); batchId String; batch ImportBatch @relation(fields:[batchId], references:[id], onDelete: Cascade); url String; caption String; savedAt DateTime; keptCategories String[]; fromCollections String[]; needsAi Boolean; suggestedCategories String[]; newCategories String[]; tags String[]; uncertain Boolean @default(false); suggested Boolean @default(false); status String @default("pending") /* pending | saved | excluded */; @@unique([batchId, url]); @@index([batchId, status]) }`
  - `model ReelEmbedding { reelId String @id; reel Reel @relation(fields:[reelId], references:[id], onDelete: Cascade); embedding Unsupported("vector(768)"); textHash String; updatedAt DateTime @updatedAt }` (Reel 쪽에 `embedding ReelEmbedding?`)
  - 마이그레이션 SQL 맨 앞에 `CREATE EXTENSION IF NOT EXISTS vector;`

- [ ] **Step 1:** `supabase start` 후 `.env`의 `DATABASE_URL`이 `127.0.0.1:54322`인지 **눈으로 확인**(운영 주소면 멈춘다).
- [ ] **Step 2:** 스키마를 고치고 `npx prisma migrate dev --create-only --name instagram_import_and_embeddings`로 SQL만 만든 뒤, 맨 앞에 확장 줄을 넣는다.
- [ ] **Step 3:** `npx prisma migrate dev` → Expected: 적용 성공. `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "\dx vector"` Expected: vector 확장 1줄.
- [ ] **Step 4:** `npx tsc --noEmit` Expected: 0 에러.
- [ ] **Step 5:** 블로그 로그(Prisma가 vector 타입을 못 다뤄 `Unsupported`와 raw SQL을 쓴 이유). 커밋 여부 확인.

### Task 4: Gemini 호출 모듈

**Files:**
- Create: `src/lib/ai/gemini.ts`
- Test: `src/lib/ai/gemini.test.ts`(재시도 판단 같은 순수 부분만)
- Create: `scripts/gemini-smoke.ts`

**Interfaces:**
- Produces:
  - `embedTexts(texts: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[][]>` — 768차원, 한 번에 최대 100개씩 나눠 보낸다.
  - `generateJson<T>(prompt: string, responseSchema: object): Promise<T>`
  - `shouldRetry(status: number): boolean` — 429와 5xx만 true.
  - 상수: `EMBEDDING_MODEL`, `EMBEDDING_DIM = 768`, `TEXT_MODEL`. 모델 이름은 구현 시점에 Gemini 공식 문서에서 확인해 정한다(임베딩은 `outputDimensionality: 768` 지원 모델, 텍스트는 JSON 응답 스키마 지원 모델). 확인한 문서 주소를 파일 맨 위 주석에 적는다.
- 재시도: 429, 5xx에서 최대 4회, 대기 1s, 2s, 4s, 8s. 그 밖의 오류는 바로 던진다. `GEMINI_API_KEY`가 없으면 명확한 오류를 던진다(키 값은 메시지에 넣지 않음).

- [ ] **Step 1: 실패하는 테스트** — `shouldRetry(429) === true`, `shouldRetry(503) === true`, `shouldRetry(400) === false`.
- [ ] **Step 2:** FAIL. **Step 3:** 구현. **Step 4:** PASS.
- [ ] **Step 5:** 사용자에게 `.env.local`에 `GEMINI_API_KEY`를 직접 넣어 달라고 요청(값을 대화에 붙이지 않게 안내). 무료 요금제면 보낸 내용이 구글 서비스 개선에 쓰일 수 있음을 다시 알린다.
- [ ] **Step 6:** `npx tsx scripts/gemini-smoke.ts` — 짧은 한국어 문장 2개 임베딩 → Expected: 길이 768 배열 2개 출력(값 일부만), "파주 사우나"와 "인천 파스타" 두 문장의 코사인 유사도 숫자 출력.
- [ ] **Step 7:** 블로그 로그. 커밋 여부 확인.

### Task 5: 가져오기 서버 액션(임시 표, AI 제안, 묶음, 저장)

**Files:**
- Create: `src/lib/instagram-import/suggest.ts`
- Test: `src/lib/instagram-import/suggest.test.ts`
- Create: `src/lib/instagram-import/actions.ts`
- Modify: `src/lib/admin-actions.ts` (`requireAdmin`을 export)

**Interfaces:**
- Consumes: `parseSavedPosts`, `parseCollections`(Task 1), `planImport`(Task 2), `generateJson`(Task 4), `normalizeTagName`(`src/lib/tag-name.ts`)
- Produces(`suggest.ts`):
  - `type Suggestion = { url: string; categories: string[]; newCategories: string[]; tags: string[]; uncertain: boolean }`
  - `buildSuggestPrompt(items: { url: string; caption: string; fromCollections: string[]; needsCategory: boolean }[], existingCategories: string[]): string`
  - `validateSuggestions(raw: unknown, input: { urls: string[]; existingCategories: string[] }): Suggestion[]` — 입력에 없는 url은 버린다. 기존 목록에 없는 카테고리는 `newCategories`로 옮긴다. 카테고리가 하나도 없으면 `uncertain: true`. 태그는 `normalizeTagName`으로 다듬고 중복을 없애고 최대 5개.
  - 상수 `SUGGEST_BATCH_SIZE = 25`
- Produces(`actions.ts`, 모두 `requireAdmin` + `DEMO_MODE`면 `{ error }`):
  - `startImport(input: { savedPostsJson: string; collectionsJson: string }): Promise<{ batchId: string; total: number; skippedExisting: number; skippedPending: number } | { error: string }>` — 이미 다른 대기 중 배치에 있는 주소도 건너뛴다(`skippedPending`).
  - `runSuggestions(batchId: string): Promise<{ processed: number; remaining: number } | { error: string }>` — `suggested=false`인 후보를 `SUGGEST_BATCH_SIZE`개만 처리. Gemini 오류가 나면 그 묶음은 `suggested=false`로 남기고 `{ error }`(다시 부르면 이어서).
  - `type ReviewGroup = { key: string; label: string; count: number; kind: "kept" | "ai" | "new" | "uncertain" }`
  - `getReviewGroups(batchId: string): Promise<ReviewGroup[]>` — `kind:"kept"`는 큰 컬렉션 이름별, `"ai"`는 AI가 기존 카테고리로 제안한 것, `"new"`는 새 카테고리 제안, `"uncertain"`은 분류 애매. 한 후보는 첫 번째 카테고리 하나의 묶음에만 보인다.
  - `getGroupCandidates(batchId: string, groupKey: string): Promise<ImportCandidate[]>`
  - `updateCandidate(id: string, patch: { categories?: string[]; tags?: string[] }): Promise<{ ok: true } | { error: string }>`
  - `excludeCandidate(id: string): Promise<{ ok: true } | { error: string }>`
  - `saveGroup(batchId: string, groupKey: string): Promise<{ saved: number } | { error: string }>` — 대기 중 후보만 `Reel`로 만든다(`caption`, `createdAt = savedAt`, `thumbnail = null`, `source = "instagram"`). 카테고리와 태그는 없으면 만들고 연결한다. 이미 같은 주소의 `Reel`이 생겼으면 건너뛴다. 저장 뒤 `status="saved"`. 벡터는 Task 8의 `upsertReelEmbeddings`를 저장한 Reel id들로 부른다(Task 8 전에는 이 호출 없이 구현하고 Task 8에서 붙인다).

- [ ] **Step 1: 실패하는 테스트(`suggest.test.ts`)**
  - 입력 url 두 개, 응답에 세 개(하나는 모르는 url) → 결과 두 개.
  - 기존 `["카페","맛집"]`, 응답 카테고리 `["피부 관리"]` → `categories: []`, `newCategories: ["피부 관리"]`, `uncertain: false`.
  - 응답 카테고리 `[]` → `uncertain: true`.
  - 태그 `["#파주"," 파주 ","사우나","스파","데이트","노천","교하"]` → 다듬어 중복 없이 최대 5개.
- [ ] **Step 2:** FAIL. **Step 3:** `suggest.ts` 구현(프롬프트: 캡션, 참고용 원래 컬렉션 이름, 기존 카테고리 목록, "맞는 게 없으면 짧은 새 카테고리 이름", "확신 없으면 빈 배열", 태그 3~5개, JSON 스키마). **Step 4:** PASS.
- [ ] **Step 5:** `actions.ts` 구현. `npx tsc --noEmit` 0 에러.
- [ ] **Step 6: 수동 확인(로컬)** — `npx tsx` 스크립트나 임시 화면 없이 Task 6 화면으로 확인해도 된다. 최소한 확인할 것: 관리자가 아닌 계정으로 `startImport` 호출 시 `/`로 돌려보내짐, 같은 파일로 `startImport` 두 번 → 두 번째 `total: 0`, `skippedPending`이 첫 번째 total과 같음.
- [ ] **Step 7:** 블로그 로그. 커밋 여부 확인.

### Task 6: 관리자 가져오기 화면(시안 C)

**Files:**
- Create: `src/app/admin/import/page.tsx`(서버, `export const dynamic = "force-dynamic"`)
- Create: `src/app/admin/import/import-client.tsx`(업로드, AI 제안 진행, 묶음 목록)
- Create: `src/app/admin/import/group-panel.tsx`(묶음 상세: 썸네일 자리, 캡션 앞 80자, 카테고리와 태그 편집, 빼기, 묶음째 저장)
- Modify: `src/app/admin/layout.tsx`(사이드바에 `{ href: "/admin/import", label: "인스타그램 가져오기" }`)

**Interfaces:**
- Consumes: Task 5의 액션 전부.

화면 규칙: 파일 두 개를 고르면 `startImport` → 결과(가져올 수, 이미 있어 건너뛴 수) 표시 → "AI 제안 시작" 버튼을 누르면 `remaining`이 0이 될 때까지 `runSuggestions`를 반복 호출하고 진행 막대를 보여 준다(오류면 멈추고 "이어서 하기" 버튼). 묶음 목록은 `kind`에 따라 `새 카테고리`, `분류 애매` 배지를 단다. "묶음째 저장"은 확인 창 없이 바로 저장하되, 저장 뒤 묶음 목록의 수를 갱신한다.

- [ ] **Step 1:** 화면 구현. `npx tsc --noEmit` 0 에러, `npm run build` 성공.
- [ ] **Step 2: 수동 확인(로컬, 사용자와 함께)** — `~/trovely-import/`의 실제 파일 두 개를 올린다 → AI 제안 끝까지 진행 → 묶음 목록에 큰 컬렉션 16개 + AI 묶음 + 새 카테고리/분류 애매가 보임 → "데이트" 묶음 열어 하나 빼고 저장 → 메인 목록에 113-1개가 캡션과 함께 보이고 날짜가 인스타그램 저장 시각 순.
- [ ] **Step 3:** 사용자 동작 확인을 받는다. 블로그 로그 + 백그라운드 에이전트로 블로그 본문 "가져오기" 단락 정리. 커밋 여부 확인.

### Task 7: 썸네일이 비어 있을 때 받아 오기 + 새로 저장할 때 캡션 저장

**Files:**
- Modify: `src/components/reel-thumbnail.tsx`
- Create: `src/lib/caption.ts`, Test: `src/lib/caption.test.ts`
- Modify: `src/lib/og.ts`(썸네일과 함께 캡션 후보도 돌려주는 `extractPreview(url): Promise<{ thumbnail: string | null; caption: string | null }>` 추가, 기존 `extractThumbnail`은 유지)
- Modify: `src/lib/actions.ts`(`createReel`에서 `caption` 저장)

**Interfaces:**
- Produces: `stripInstagramMetaPrefix(description: string): string` — `"234 likes, 0 comments - 계정 on November 4, 2026: ”본문”."` 형태에서 본문만 돌려준다(앞뒤 따옴표 ” “ 와 끝의 `.` 제거). 형태가 다르면 원문 그대로.

- [ ] **Step 1: 실패하는 테스트** — 위 예시 → `"본문"`; 한국어 로케일 형태가 올 수도 있으니 접두가 없는 문자열은 그대로; 빈 문자열은 빈 문자열.
- [ ] **Step 2:** FAIL. **Step 3:** 구현(유튜브는 oEmbed `title`, 인스타그램은 microlink `data.description`을 정리). **Step 4:** PASS.
- [ ] **Step 5:** `ReelThumbnail`: `src`가 비어 있고 `reelId`가 있으면, 카드가 화면에 들어왔을 때(IntersectionObserver) `refreshThumbnail`을 한 번만 부른다. 기존 깨짐 복구와 같은 1회 가드를 쓴다.
- [ ] **Step 6: 수동 확인** — 가져온 게시물 목록을 내리면 썸네일이 하나씩 채워지거나, 한도에 걸리면 대체 화면으로 남는다(무한 재시도 없음, 브라우저 네트워크 탭에서 카드당 1번). 새 인스타그램 게시물을 저장하면 DB `caption`에 본문이 들어간다.
- [ ] **Step 7:** 블로그 로그. 커밋 여부 확인.

### Task 8: 벡터 만들기와 갱신

**Files:**
- Create: `src/lib/search/embedding-text.ts`, Test: `src/lib/search/embedding-text.test.ts`
- Create: `src/lib/search/embeddings.ts`
- Create: `scripts/backfill-embeddings.ts`
- Modify: `src/lib/actions.ts`(`createReel`, `updateReel`, 카테고리, 태그 이름 변경 뒤 해당 Reel들 `upsertReelEmbeddings`), `src/lib/instagram-import/actions.ts`(`saveGroup` 뒤)

**Interfaces:**
- Produces:
  - `buildEmbeddingText(r: { caption: string | null; memo: string | null; review: string | null; categories: string[]; tags: string[] }): string` — 순서: `카테고리: …\n태그: …\n캡션: …\n메모: …\n후기: …`, 빈 칸은 줄째 생략, 캡션은 최대 2,000자.
  - `hashText(text: string): string`(sha256 hex)
  - `upsertReelEmbeddings(reelIds: string[]): Promise<{ updated: number; skipped: number }>` — 글 해시가 같으면 건너뛴다. raw SQL `INSERT ... ON CONFLICT ("reelId") DO UPDATE`로 `'[…]'::vector` 저장. 실패해도 저장 자체는 실패로 처리하지 않는다(로그만).

- [ ] **Step 1: 실패하는 테스트** — 메모만 바뀌면 `hashText(buildEmbeddingText(...))`가 바뀐다; 빈 메모, 빈 후기 줄은 결과에 없다; 3,000자 캡션은 2,000자로 잘린다.
- [ ] **Step 2:** FAIL. **Step 3:** 구현. **Step 4:** PASS.
- [ ] **Step 5:** `npx tsx scripts/backfill-embeddings.ts` — 로컬 DB의 벡터 없는 Reel 전부를 100개씩 처리, 진행 수 출력. Expected: 마지막 줄 `updated: N, skipped: 0`, `select count(*) from "ReelEmbedding"`이 Reel 수와 같음.
- [ ] **Step 6:** 게시물 하나의 메모를 화면에서 고친 뒤 그 행의 `textHash`가 바뀌었는지 SQL로 확인.
- [ ] **Step 7:** 블로그 로그. 커밋 여부 확인.

### Task 9: 뜻 검색과 화면 전환

**Files:**
- Create: `src/lib/search/semantic.ts`
- Modify: `src/lib/actions.ts`(`getReels` 단어 검색의 OR에 `{ caption: { contains: keyword, mode: "insensitive" } }` 추가, 새 서버 액션 `searchReelsSemantic`)
- Modify: `src/components/search-bar.tsx`(단어/뜻 전환, URL 쿼리 `mode=semantic`)
- Modify: `src/app/(main)/page.tsx`(뜻 모드면 결과 20개 고정, 정렬 메뉴와 이어 불러오기 숨김, 문구 `뜻으로 찾은 결과(가까운 순)`)

**Interfaces:**
- Consumes: `embedTexts`(Task 4), `ReelEmbedding`(Task 3)
- Produces: `searchReelsSemantic({ query, categoryId, source }: { query: string; categoryId?: string | "uncategorized"; source?: ReelSource }): Promise<{ items: ReelWithRelations[] }>` — `RETRIEVAL_QUERY`로 검색어 벡터를 만들고, `userId`와 필터를 건 뒤 `embedding <=> $1::vector` 오름차순 상위 20개. `items` 모양은 `getReels`의 `items`와 같게 해서 기존 카드를 그대로 쓴다. 데모 모드는 기존 목 검색으로 넘긴다.

- [ ] **Step 1:** 구현. `npx tsc --noEmit` 0, `npm run build` 성공.
- [ ] **Step 2: 수동 확인** — "데이트" 카테고리 선택 + 뜻 모드 "파주 사우나" → "파주 사우나 왜 아무도 안 알려줬어요" 릴스가 상위 5개 안. 같은 조건 단어 모드 결과도 기록. 정렬 메뉴가 뜻 모드에서 안 보임.
- [ ] **Step 3:** 블로그 로그 + 백그라운드 에이전트로 "뜻 검색 붙이기" 단락 정리. 커밋 여부 확인.

### Task 10: 측정

**Files:**
- Create: `docs/search-eval/queries.json`
- Create: `scripts/measure-search.ts`
- Create: `docs/search-eval/results-YYYY-MM-DD.md`(스크립트 출력)

**Interfaces:**
- `queries.json`: `[{ "id": "q1", "category": "데이트", "query": "파주 사우나", "expected": ["https://www.instagram.com/reel/…/"] }]` 10개 안팎.
- 스크립트는 로그인 없이 돌아야 하므로 `userId`를 인자로 받는다(`npx tsx scripts/measure-search.ts --user <로컬 사용자 id>`). 단어 검색은 `getReels`와 같은 AND 규칙을 쓰도록 `getReels`의 where 만들기를 `buildKeywordWhere(userId, search, categoryId)`로 빼서 둘이 함께 쓴다.

- [ ] **Step 1:** 질문 초안 10개를 만든다. 사용자의 세 문장 모양(카테고리 + 지역 + 종류)을 따르고, 정답 게시물이 실제로 있는 것만. 단어 검색이 걸려 넘어질 만한 경우(스파이시, 고기리, 찜질 = 사우나)를 섞는다.
- [ ] **Step 2:** 사용자에게 질문과 정답을 보여 주고 "내가 실제로 이렇게 찾을 것 같다"인지 확인받는다. 고친 내용 반영.
- [ ] **Step 3:** `buildKeywordWhere`로 빼낸 뒤 `npx tsc --noEmit` 0 에러, 메인 화면 단어 검색이 전과 같게 동작(수동).
- [ ] **Step 4:** 스크립트 실행. Expected 출력: 질문별 단어/뜻 각각 정답 순위(없으면 `-`), 상위 5개 안 엉뚱한 수, 마지막 줄 `keyword hit@5 = a/10, semantic hit@5 = b/10`. 결과를 `results-…md`로 저장.
- [ ] **Step 5:** 결과를 사용자에게 보고하고, 뜻 검색을 기본값으로 둘지, 붙여 둘지 자체를 함께 정한다(설계: 낫지 않으면 붙이지 않는 것도 정상 결론).
- [ ] **Step 6:** 블로그 로그 + 백그라운드 에이전트로 측정 결과와 결론 단락 정리. 커밋 여부 확인.

### Task 11: AI 답 (질문 읽기, 찾기, 답 쓰기)

**Files:**
- Create: `src/lib/search/ask.ts`, Test: `src/lib/search/ask.test.ts`
- Create: `src/lib/search/ask-actions.ts`("use server")
- Create: `src/components/ask-answer.tsx`
- Modify: `src/components/search-bar.tsx`(엔터 처리, 안내 문구), `src/app/(main)/page.tsx`(답 영역 자리, 관리자 여부 전달)
- Delete: `src/app/(main)/_ask-mockup/`, `src/app/(main)/mockup-ask-a/`, `src/app/(main)/mockup-ask-b/`(커밋하지 않은 시안)

**Interfaces:**
- Consumes: `generateJson`(Task 4), `searchReelsSemantic`의 검색 부분(Task 9, 조건 `visited?: boolean`를 받도록 넓힌다), `describeAiError`
- Produces:
  - `type AskChip = { label: string; kind: "keyword" | "unvisited" | "visited" }`
  - `validateChips(raw: unknown): AskChip[]` — 모르는 kind 버림, 빈 label 버림, `unvisited`와 `visited`가 함께 오면 둘 다 버림, 같은 칩 중복 제거.
  - `searchTextFrom(chips: AskChip[], question: string): string` — keyword 칩을 띄어쓰기로 이어 붙임, 없으면 `question`.
  - `visitedFilterFrom(chips: AskChip[]): boolean | undefined`
  - `buildAnswerPrompt(question: string, reels: AnswerReel[]): string`, `ANSWER_SCHEMA`
  - `validateAnswer(raw: unknown, givenIds: string[]): { text: string; usedIds: string[] } | { notFound: true }` — 건넨 id 밖은 버림, 남은 id가 없으면 `notFound`(AI가 "없다"고 답한 경우도 `notFound`로 같은 문구).
  - 서버 액션 `askReels({ question, chips?, categoryId, source }): Promise<{ chips: AskChip[]; answer: { text: string; usedIds: string[] } | { notFound: true }; items: ReelWithRelations[] } | { error: string }>` — `chips`가 오면 질문 읽기를 건너뛴다(×로 뺀 뒤 다시 할 때). 관리자 아니면, 데모 모드면 `{ error }`.

- [ ] **Step 1: 실패하는 테스트** — `validateChips`(모르는 kind, 빈 label, 서로 반대 조건, 중복), `searchTextFrom`(칩 없음 → 질문 그대로, keyword만 이어 붙임), `visitedFilterFrom`, `validateAnswer`(건네지 않은 id 버림, 모두 버려지면 `notFound`, 정상).
- [ ] **Step 2:** FAIL 확인. **Step 3:** 구현. **Step 4:** PASS, `npx tsc --noEmit` 0.
- [ ] **Step 5:** 화면 연결. 시안 a(`mockup-ask-a`)와 같은 자리, 같은 문구. 시안 파일 지우기.
- [ ] **Step 6: 수동 확인(사용자)** — 관리자 계정에서 "이번 주말 파주에서 안 가 본 데이트 장소 있어?" 엔터 → 칩에 `안 가 본 곳만`, 목록에 별표 빈 릴스만, 근거 표시. `안 가 본 곳만` × → 가 본 릴스도 나옴. 관리자 아닌 계정에서는 엔터가 검색만 함.
- [ ] **Step 7: 측정** — 설계 5-6의 시험 질문 5개를 사용자와 정하고, 칩, 답, 근거, 맞다/틀리다, 버린 id 수를 `docs/search-eval/answers-YYYY-MM-DD.md`에 기록.
- [ ] **Step 8:** 블로그 로그 + 백그라운드 에이전트로 "생성 단계 붙이기" 단락 정리. 커밋.

### Task 12: 마무리

- [ ] **Step 1:** `npm test` 전부 PASS, `npx tsc --noEmit` 0, `npm run build` 성공 출력 붙이기.
- [ ] **Step 2:** 사용자에게 남은 일 보고: 운영 반영(Session pooler로 마이그레이션, 운영 Supabase에 vector 확장, Vercel에 `GEMINI_API_KEY`, 운영에서 실제 가져오기)은 사용자 확인 뒤 별도 진행. PR 생성도 요청 시에만.
- [ ] **Step 3:** 블로그 초안 최종 정리(백그라운드 에이전트), 로그 한 줄.
