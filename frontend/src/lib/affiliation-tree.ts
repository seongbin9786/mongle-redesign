import type { ChipResponse } from '@/apis/generated/mongle-api.schemas'

// 소속 칩 목록은 서버에서 평평한 배열(부모·자식이 섞인 displayOrder 순)로 온다.
// 계층을 그리는 화면(인물 폼·태그 설정)이 매번 같은 그룹핑을 다시 짜지 않도록 여기 한 곳에 둔다.
// 중첩은 1단계라 자식의 자식은 없다 — 그래서 트리가 아니라 (루트, 자식맵)이면 충분하다.
export function groupAffiliations(chips: ChipResponse[]) {
  const roots = chips.filter((chip) => chip.parentId == null)
  const byParent = new Map<number, ChipResponse[]>()

  chips.forEach((chip) => {
    if (chip.parentId == null) return
    const siblings = byParent.get(chip.parentId)
    if (siblings) siblings.push(chip)
    else byParent.set(chip.parentId, [chip])
  })

  return {
    roots,
    childrenOf: (rootId: number) => byParent.get(rootId) ?? [],
  }
}
