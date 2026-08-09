import type { AffiliationRef } from '@/apis/generated/mongle-api.schemas'
import { normalizeChipColor } from '@/lib/relation-tag-colors'

// 소속 표시 규칙의 단일 출처. 목록·검색·프로필이 같은 규칙으로 그려야
// 한 사람의 색과 이름이 화면마다 달라지지 않는다.
//
// 규칙(mustpass people-directory):
// - 색은 **루트 소속 하나**가 정한다. 하위 소속은 색이 없으므로 하위에 붙은 사람도 루트 색을 쓴다.
// - 텍스트로 부르는 이름도 루트 라벨이고, 하위는 무채색 chip 하나로 덧붙는다.

/** 아바타 ring 에 쓸 색. 소속이 없거나 색이 비면 null — 화면은 무채색을 유지한다. */
export function affiliationColor(affiliation?: AffiliationRef): string | null {
  const root = affiliationRoot(affiliation)
  return root?.color ? normalizeChipColor(root.color) : null
}

/** 소속을 한마디로 부르는 라벨(= 루트). */
export function affiliationLabel(affiliation?: AffiliationRef): string | null {
  return affiliationRoot(affiliation)?.label ?? null
}

/** 하위 소속이 있을 때만 채워지는 무채색 chip 라벨. */
export function affiliationDetailLabel(
  affiliation?: AffiliationRef,
): string | null {
  return affiliation?.parent ? affiliation.label : null
}

function affiliationRoot(affiliation?: AffiliationRef) {
  if (!affiliation) return null
  return affiliation.parent ?? affiliation
}
