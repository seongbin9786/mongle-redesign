import { mutationOptions } from '@tanstack/react-query'
import {
  createZone,
  deleteZone,
  replaceZonePersons,
  updateZone,
} from '@/apis/generated/mongle-api'
import type {
  ZoneCreateRequest,
  ZoneUpdateRequest,
} from '@/apis/generated/mongle-api.schemas'

export const create = () =>
  mutationOptions({
    mutationFn: (request: ZoneCreateRequest) => createZone(request),
  })

export const update = () =>
  mutationOptions({
    mutationFn: ({ id, request }: { id: number; request: ZoneUpdateRequest }) =>
      updateZone(id, request),
  })

export const remove = () =>
  mutationOptions({
    mutationFn: deleteZone,
  })

/** 인물 할당은 전체 교체다 — 지금 고른 상태를 통째로 보낸다(mustpass 06-zone). */
export const replacePersons = () =>
  mutationOptions({
    mutationFn: ({ id, personIds }: { id: number; personIds: number[] }) =>
      replaceZonePersons(id, { personIds }),
  })
