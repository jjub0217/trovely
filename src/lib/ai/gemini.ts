/**
 * Gemini REST 호출(새 SDK 의존성 없이 fetch로).
 * 참고 문서: https://ai.google.dev/api/embeddings , https://ai.google.dev/api/generate-content
 * 모델 이름은 scripts/gemini-smoke.ts로 실제 호출해 확인한다.
 */

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIM = 768;
export const TEXT_MODEL = "gemini-3.8-flash";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

/** 다시 시도할 때 기다리는 시간. 검색처럼 빨라야 하는 요청은 retries 0으로 다시 시도하지 않는다 */
export function retryDelays(retries = RETRY_DELAYS_MS.length): number[] {
  return RETRY_DELAYS_MS.slice(0, retries);
}

export type GeminiCallOptions = { retries?: number; timeoutMs?: number };
const EMBED_BATCH = 100;

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

/** 화면에 보여 줄 짧은 오류 설명 */
export function describeAiError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  const msg = String((e as { message?: string })?.message ?? e);
  if (name === "TimeoutError") return "AI 응답이 너무 오래 걸려 멈췄습니다. 잠시 뒤 다시 누르면 이어서 합니다.";
  if (/\((429|503)\)/.test(msg)) return "AI 서비스가 지금 붐벼서 요청을 받지 않습니다. 잠시 뒤 다시 누르면 이어서 합니다.";
  return `AI 요청이 실패했습니다: ${msg.slice(0, 120)}`;
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다(.env.local 또는 Vercel 환경변수).");
  return key;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJson(path: string, body: unknown, options: GeminiCallOptions = {}): Promise<unknown> {
  const delays = retryDelays(options.retries);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 180000),
    });
    if (res.ok) return res.json();
    if (shouldRetry(res.status) && attempt < delays.length) {
      await sleep(delays[attempt]);
      continue;
    }
    // 응답 본문 앞부분만(키는 헤더에 있어 본문에 나오지 않는다)
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini 요청 실패(${res.status}): ${detail}`);
  }
}

export async function embedTexts(texts: string[], taskType: EmbedTaskType, options?: GeminiCallOptions): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const chunk = texts.slice(i, i + EMBED_BATCH);
    const data = (await postJson(`models/${EMBEDDING_MODEL}:batchEmbedContents`, {
      requests: chunk.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIM,
      })),
    }, options)) as { embeddings?: { values: number[] }[] };
    const embeddings = data.embeddings ?? [];
    if (embeddings.length !== chunk.length) {
      throw new Error(`임베딩 개수가 맞지 않습니다(요청 ${chunk.length}, 응답 ${embeddings.length})`);
    }
    out.push(...embeddings.map((e) => e.values));
  }
  return out;
}

/**
 * 답하기 전에 속으로 생각하는 단계의 양. gemini-3.8-flash는 기본 medium이고 low까지 낮출 수 있다
 * (https://aistudio.google.com/docs/thinking). 2026-11-27 측정: AI에게 물어보기 5문항 평균 18.3초 → low 8.2초, 답의 질 비슷
 */
export type ThinkingLevel = "low" | "medium" | "high";
export type GenerateOptions = { thinkingLevel?: ThinkingLevel };

export function buildGenerateBody(prompt: string, responseSchema: object, options: GenerateOptions = {}): object {
  return {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
      ...(options.thinkingLevel ? { thinkingConfig: { thinkingLevel: options.thinkingLevel } } : {}),
    },
  };
}

export async function generateJson<T>(prompt: string, responseSchema: object, options: GenerateOptions = {}): Promise<T> {
  const data = (await postJson(
    `models/${TEXT_MODEL}:generateContent`,
    buildGenerateBody(prompt, responseSchema, options),
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return JSON.parse(text) as T;
}
