import { mutationOptions } from '@tanstack/react-query'
import { replaceRelationGraph } from '@/apis/generated/mongle-api'
import type { RelationGraphRequest } from '@/apis/generated/mongle-api.schemas'

/** 관계도 저장은 전체 교체다 — 캔버스 한 번의 조작이 노드·선·좌표를 동시에 바꾼다(mustpass 07-relation-graph). */
export const replace = () =>
  mutationOptions({
    mutationFn: (request: RelationGraphRequest) =>
      replaceRelationGraph(request),
  })
