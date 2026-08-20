import { describe, expect, it } from 'vitest'
import type {
  PersonNode,
  ZoneResponse,
} from '@/apis/generated/mongle-api.schemas'
import {
  ALL_UNIVERSE_ID,
  CREATE_UNIVERSE_ID,
  ZONE_MAX,
  buildUniverses,
  nextUniverseIndex,
} from './home-universes'

function person(id: number, name: string): PersonNode {
  return {
    id,
    name,
    profileImageUrl: null,
    avatarGender: null,
    favorite: false,
    recordCount: 1,
    relationTags: [],
    intimacy: { status: 'NORMAL', daysSinceLastMeet: null },
    firstMetDate: null,
  }
}

function zone(
  id: number,
  name: string,
  personIds: number[],
  color: string | null = null,
): ZoneResponse {
  return { id, name, color, order: id, personIds }
}

const nodes = [person(1, '가'), person(2, '나'), person(3, '다')]

describe('buildUniverses', () => {
  it('첫 장은 전체, 존은 순서대로, 마지막은 만들기 장이다', () => {
    const universes = buildUniverses(nodes, [
      zone(7, '최애존', [1, 3], '#E06A2B'),
      zone(8, '말잇못존', [2]),
    ])

    expect(universes.map((u) => u.id)).toEqual([
      ALL_UNIVERSE_ID,
      'zone:7',
      'zone:8',
      CREATE_UNIVERSE_ID,
    ])
    expect(universes[0].nodes).toHaveLength(3)
    expect(universes[1].nodes.map((n) => n.id)).toEqual([1, 3])
    expect(universes[1].color).toBe('#E06A2B')
    expect(universes[2].color).toBeNull()
    expect(universes[3].kind).toBe('create')
  })

  it('존이 없어도 만들기 장이 남아 스와이프할 곳이 있다', () => {
    const universes = buildUniverses(nodes, [])
    expect(universes.map((u) => u.kind)).toEqual(['all', 'create'])
    expect(universes[1].name).toBe('존 만들기')
  })

  it('존이 있으면 만들기 장의 이름이 새 우주로 바뀐다', () => {
    const universes = buildUniverses(nodes, [zone(7, '최애존', [1])])
    expect(universes[2].name).toBe('새 우주')
  })

  it('존 상한에 닿으면 만들기 장을 접는다', () => {
    const full = Array.from({ length: ZONE_MAX }, (_, index) =>
      zone(index + 1, `존${index + 1}`, []),
    )
    const universes = buildUniverses(nodes, full)
    expect(universes).toHaveLength(ZONE_MAX + 1)
    expect(universes.some((u) => u.kind === 'create')).toBe(false)
  })

  it('비어 있는 존도 우주로 남는다', () => {
    const universes = buildUniverses(nodes, [zone(9, '새 존', [])])
    expect(universes[1].kind).toBe('zone')
    expect(universes[1].nodes).toEqual([])
  })

  it('관계 지도에 없는 인물 id는 무시한다', () => {
    const universes = buildUniverses(nodes, [zone(9, '존', [1, 999])])
    expect(universes[1].nodes.map((n) => n.id)).toEqual([1])
  })
})

describe('nextUniverseIndex', () => {
  it('양 끝에서 멈춘다(순환하지 않는다)', () => {
    expect(nextUniverseIndex(0, -1, 3)).toBe(0)
    expect(nextUniverseIndex(0, 1, 3)).toBe(1)
    expect(nextUniverseIndex(2, 1, 3)).toBe(2)
  })

  it('우주가 없으면 0으로 떨어진다', () => {
    expect(nextUniverseIndex(0, 1, 0)).toBe(0)
  })
})
