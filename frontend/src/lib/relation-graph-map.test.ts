import { describe, expect, it } from 'vitest'
import {
  MAP_MIN_GROUP_HEIGHT,
  MAP_MIN_GROUP_WIDTH,
  MAP_SCALE_MAX,
  MAP_SCALE_MIN,
  clampScale,
  zoomAt,
  freePosition,
  groupAt,
  groupSize,
  memberPosition,
  nextGroupOrigin,
} from '@/lib/relation-graph-map'
import type { MapGroup } from '@/lib/relation-graph-map'

const group = (over: Partial<MapGroup> = {}): MapGroup => ({
  key: 'tag:1',
  name: '직장',
  color: '#22A06B',
  x: 24,
  y: 24,
  width: 200,
  height: 160,
  ...over,
})

describe('relation graph map', () => {
  it('사람이 늘면 영역도 커진다', () => {
    const one = groupSize(1)
    expect(one.width).toBe(MAP_MIN_GROUP_WIDTH)
    expect(one.height).toBe(MAP_MIN_GROUP_HEIGHT)
    expect(groupSize(9).width).toBeGreaterThan(one.width)
    expect(groupSize(9).height).toBeGreaterThan(one.height)
  })

  it('한 줄에 세 명을 넘기지 않는다', () => {
    const wide = groupSize(12)
    expect(wide.width).toBe(groupSize(9).width)
  })

  it('새 영역은 기존 영역들의 오른쪽에 놓인다', () => {
    expect(nextGroupOrigin([])).toEqual({ x: 24, y: 24 })
    const origin = nextGroupOrigin([group({ x: 24, width: 200 })])
    expect(origin.x).toBeGreaterThan(224)
    expect(origin.y).toBe(24)
  })

  it('영역 안 인물은 영역 경계 안에 놓인다', () => {
    const size = groupSize(4)
    const target = group({ ...size })
    for (let index = 0; index < 4; index += 1) {
      const spot = memberPosition(target, index, 4)
      expect(spot.x).toBeGreaterThan(target.x)
      expect(spot.x).toBeLessThan(target.x + target.width)
      expect(spot.y).toBeGreaterThan(target.y)
      expect(spot.y).toBeLessThan(target.y + target.height)
    }
  })

  it('영역이 없는 인물은 영역 아래 들판에 놓인다', () => {
    const target = group({ y: 24, height: 160 })
    expect(freePosition(0, [target]).y).toBeGreaterThan(
      target.y + target.height,
    )
    expect(freePosition(0, []).y).toBeLessThan(freePosition(0, [target]).y)
  })

  it('겹친 영역에서는 나중(위에 그려진) 영역이 이긴다', () => {
    const under = group({ key: 'a', x: 0, y: 0, width: 200, height: 200 })
    const over = group({ key: 'b', x: 100, y: 100, width: 200, height: 200 })
    expect(groupAt([under, over], 150, 150)).toBe('b')
    expect(groupAt([under, over], 50, 50)).toBe('a')
    expect(groupAt([under, over], 400, 400)).toBeNull()
  })
})

describe('map view', () => {
  it('배율은 한계 안으로 조인다', () => {
    expect(clampScale(10)).toBe(MAP_SCALE_MAX)
    expect(clampScale(0.01)).toBe(MAP_SCALE_MIN)
    expect(clampScale(Number.NaN)).toBe(1)
  })

  it('확대해도 초점 아래의 지도 좌표는 그대로다', () => {
    const view = { x: 30, y: -20, scale: 1 }
    const focus = { x: 200, y: 300 }
    const before = {
      x: (focus.x - view.x) / view.scale,
      y: (focus.y - view.y) / view.scale,
    }
    const next = zoomAt(view, 1.8, focus)
    const after = {
      x: (focus.x - next.x) / next.scale,
      y: (focus.y - next.y) / next.scale,
    }
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('새 영역은 들판의 인물까지 피해서 놓인다', () => {
    const nodes = [{ x: 600, y: 40 }]
    expect(nextGroupOrigin([], nodes).x).toBeGreaterThan(600)
    expect(nextGroupOrigin([], []).x).toBe(24)
  })

  it('새 인물은 이미 놓인 인물 아래에 놓인다', () => {
    const nodes = [{ x: 40, y: 500 }]
    expect(freePosition(0, [], nodes).y).toBeGreaterThan(500)
  })
})
