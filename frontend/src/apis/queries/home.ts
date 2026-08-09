import { queryOptions } from '@tanstack/react-query'
import { getRelationMap } from '@/apis/generated/mongle-api'
import { queryKeyNamespaces } from '@/apis/queries/_namespaces'

const queryKeys = {
  all: [queryKeyNamespaces.home] as const,
  relationMap: (relationTagChipIds?: number[]) =>
    [
      queryKeyNamespaces.home,
      'relation-map',
      [...(relationTagChipIds ?? [])].sort((a, b) => a - b),
    ] as const,
}

export const relationMap = (relationTagChipIds?: number[]) =>
  queryOptions({
    queryKey: queryKeys.relationMap(relationTagChipIds),
    queryFn: () => getRelationMap({ relationTagChipIds }),
  })

export const allKey = queryKeys.all
