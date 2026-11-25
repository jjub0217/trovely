/** 낱말 결과 아래에 붙일 "뜻이 비슷한 릴스": 뜻 결과 중 낱말 결과에 없는 것만, 뜻이 가까운 순서대로 */
export function similarExtras(keywordIds: string[], semanticIds: string[]): string[] {
  const seen = new Set(keywordIds);
  return semanticIds.filter((id) => !seen.has(id));
}

/** 합친 순서(측정용): 낱말 결과 전체 다음에 나머지 뜻 결과 */
export function hybridOrder(keywordIds: string[], semanticIds: string[]): string[] {
  return [...keywordIds, ...similarExtras(keywordIds, semanticIds)];
}
