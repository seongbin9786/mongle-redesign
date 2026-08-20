import { queryOptions } from '@tanstack/react-query'
import { getZones } from '@/apis/generated/mongle-api'
import { queryKeyNamespaces } from '@/apis/queries/_namespaces'

const queryKeys = {
  all: [queryKeyNamespaces.zones] as const,
}

export const list = () =>
  queryOptions({
    queryKey: queryKeys.all,
    queryFn: getZones,
  })

export const allKey = queryKeys.all
