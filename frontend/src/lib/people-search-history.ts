// 사람 검색의 최근 검색어. 서버에 남기지 않고 이 기기에만 둔다 —
// 검색어는 "누구를 찾고 있었나"라서 계정 데이터보다 사적이고, 기기별로 달라도 무방하다.
export const PEOPLE_SEARCH_HISTORY_KEY = 'mongle:people-search-history:v1'

// 화면에서 한눈에 훑을 수 있는 만큼만. 넘치면 오래된 것부터 밀어낸다.
const MAX_ENTRIES = 8

export function getPeopleSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem(PEOPLE_SEARCH_HISTORY_KEY)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .slice(0, MAX_ENTRIES)
  } catch {
    // private browsing·깨진 값
    return []
  }
}

/** 같은 검색어를 다시 하면 중복으로 쌓지 않고 맨 앞으로 끌어올린다. */
export function addPeopleSearchHistory(term: string): string[] {
  const trimmed = term.trim()
  if (!trimmed) return getPeopleSearchHistory()
  const next = [
    trimmed,
    ...getPeopleSearchHistory().filter((item) => item !== trimmed),
  ].slice(0, MAX_ENTRIES)
  return write(next)
}

export function removePeopleSearchHistory(term: string): string[] {
  return write(getPeopleSearchHistory().filter((item) => item !== term))
}

export function clearPeopleSearchHistory(): string[] {
  return write([])
}

function write(entries: string[]): string[] {
  try {
    localStorage.setItem(PEOPLE_SEARCH_HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // 저장에 실패해도 화면은 방금 만든 목록으로 계속 굴러가야 한다.
  }
  return entries
}
