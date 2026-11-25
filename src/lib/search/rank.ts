/** 뜻 검색이 돌려준 id 순서대로 다시 정렬한다(DB에서 다시 읽으면 순서가 섞이므로) */
export function orderByIds<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}
