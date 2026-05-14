export const LIST_RETURN_KEY = "trove:list-return";

export type ListReturnState = {
  url: string;
  scrollY: number;
  reelId?: string;
};

export function readListReturnState(): ListReturnState | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(LIST_RETURN_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ListReturnState;
    if (typeof parsed.url !== "string" || typeof parsed.scrollY !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeListReturnState(state: ListReturnState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LIST_RETURN_KEY, JSON.stringify(state));
}

export function clearListReturnState() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LIST_RETURN_KEY);
}
