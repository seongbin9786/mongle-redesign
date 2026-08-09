import { queryOptions } from '@tanstack/react-query'
import { getChips } from '@/apis/generated/mongle-api'
import type { ChipResponseType } from '@/apis/generated/mongle-api.schemas'
import { queryKeyNamespaces } from '@/apis/queries/_namespaces'

// 여기 빠진 종류는 chipQuery.all()을 쓰는 화면에서 통째로 사라진다(소속 도입 때 실제로 겪음).
// 새 ChipType을 만들면 이 목록에도 반드시 더한다.
export const CHIP_TYPES: ChipResponseType[] = [
  'CATEGORY',
  'RELATION_TAG',
  'AFFILIATION',
  'EMOTION',
  'WEATHER',
]

const queryKeys = {
  all: [queryKeyNamespaces.chips] as const,
  byType: (type: ChipResponseType) => [queryKeyNamespaces.chips, type] as const,
}

export const all = () =>
  queryOptions({
    queryKey: queryKeys.all,
    queryFn: async () =>
      (await Promise.all(CHIP_TYPES.map((type) => getChips({ type })))).flat(),
  })

export const byType = (type: ChipResponseType) =>
  queryOptions({
    queryKey: queryKeys.byType(type),
    queryFn: () => getChips({ type }),
  })

export const allKey = queryKeys.all
