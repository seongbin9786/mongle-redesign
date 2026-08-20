import { queryOptions } from '@tanstack/react-query'
import { getRelationGraph } from '@/apis/generated/mongle-api'
import { queryKeyNamespaces } from '@/apis/queries/_namespaces'

const queryKeys = {
  all: [queryKeyNamespaces.relationGraph] as const,
}

export const get = () =>
  queryOptions({
    queryKey: queryKeys.all,
    queryFn: getRelationGraph,
  })

export const allKey = queryKeys.all
