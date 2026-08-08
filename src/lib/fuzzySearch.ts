// Subsequence-based fuzzy matcher: query characters must appear in target, in
// order, but not necessarily contiguously. Score rewards contiguous runs and
// matches near the start so tighter/earlier matches rank higher.
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();

  if (q.length === 0) return 0;

  let score = 0;
  let targetIndex = 0;
  let consecutiveRun = 0;

  for (let queryIndex = 0; queryIndex < q.length; queryIndex++) {
    const char = q[queryIndex];
    const foundAt = t.indexOf(char, targetIndex);

    if (foundAt === -1) return null;

    const gap = foundAt - targetIndex;
    if (gap === 0) {
      consecutiveRun += 1;
      score += 10 + consecutiveRun * 2;
    } else {
      consecutiveRun = 0;
      score += Math.max(1, 5 - gap);
    }

    if (foundAt === 0) score += 5;

    targetIndex = foundAt + 1;
  }

  score -= t.length * 0.1;

  return score;
}

export interface FuzzyMatch<T> {
  item: T;
  score: number;
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string,
): FuzzyMatch<T>[] {
  if (query.trim().length === 0) {
    return items.map((item) => ({ item, score: 0 }));
  }

  const matches: FuzzyMatch<T>[] = [];
  for (const item of items) {
    const score = fuzzyScore(query, getSearchText(item));
    if (score !== null) {
      matches.push({ item, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
