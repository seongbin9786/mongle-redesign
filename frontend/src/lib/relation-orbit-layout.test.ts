import { describe, expect, it } from 'vitest'
import {
  ORBIT_GEOMETRY,
  formatDaysSinceLastMeet,
  formatKnownDuration,
  layoutOrbit,
  orbitArcPath,
  orbitRingIndex,
  orbitRingRadii,
  orbitRings,
} from './relation-orbit-layout'

// 테스트는 '올해' 경계가 달력에 흔들리지 않도록 고정 날짜의 링을 쓴다.
const rings = orbitRings(new Date(2026, 7, 9)) // 8/9 → 1/1 이후 220일

describe('orbitRings', () => {
  it('7단 경계를 라벨 순서대로 만든다', () => {
    expect(rings.map((ring) => ring.label)).toEqual([
      '7일',
      '1달',
      '3달',
      '올해',
      '1년',
      '3년',
      '그 이전',
    ])
    expect(rings.map((ring) => ring.maxDays)).toEqual([
      7,
      31,
      92,
      220,
      365,
      1095,
      Number.POSITIVE_INFINITY,
    ])
  })

  it("연초에도 '올해'가 3달과 1년 사이에 남는다", () => {
    const january = orbitRings(new Date(2026, 0, 5))
    expect(january[3].maxDays).toBe(93)
    expect(january[2].maxDays).toBeLessThan(january[3].maxDays)
    expect(january[3].maxDays).toBeLessThan(january[4].maxDays)
  })
})

describe('orbitRingIndex', () => {
  it('경계값에서 링 라벨의 의미대로 배정한다', () => {
    expect(orbitRingIndex(0, rings)).toBe(0)
    expect(orbitRingIndex(7, rings)).toBe(0)
    expect(orbitRingIndex(8, rings)).toBe(1)
    expect(orbitRingIndex(31, rings)).toBe(1)
    expect(orbitRingIndex(32, rings)).toBe(2)
    expect(orbitRingIndex(92, rings)).toBe(2)
    expect(orbitRingIndex(93, rings)).toBe(3)
    expect(orbitRingIndex(220, rings)).toBe(3)
    expect(orbitRingIndex(221, rings)).toBe(4)
    expect(orbitRingIndex(365, rings)).toBe(4)
    expect(orbitRingIndex(366, rings)).toBe(5)
    expect(orbitRingIndex(1095, rings)).toBe(5)
    expect(orbitRingIndex(1096, rings)).toBe(6)
  })

  it('만남 이력이 없거나 유효하지 않으면 그 이전 링에 둔다', () => {
    expect(orbitRingIndex(null, rings)).toBe(6)
    expect(orbitRingIndex(undefined, rings)).toBe(6)
    expect(orbitRingIndex(-3, rings)).toBe(6)
  })
})

describe('orbitRingRadii', () => {
  it('인원이 없어도 링은 사라지지 않고 반경이 계속 커진다', () => {
    const radii = orbitRingRadii([0, 0, 0, 0, 0, 0, 0])
    expect(radii).toHaveLength(7)
    for (let i = 1; i < radii.length; i += 1) {
      expect(radii[i]).toBeGreaterThan(radii[i - 1])
    }
  })

  it('인원이 많은 링은 둘레가 인원을 감당하도록 지름이 커진다', () => {
    const few = orbitRingRadii([2, 0, 0, 0, 0, 0, 0])
    const many = orbitRingRadii([30, 0, 0, 0, 0, 0, 0])
    expect(many[0]).toBeGreaterThan(few[0])
    // 둘레 ≥ 인원 × 노드 호 길이
    expect(2 * Math.PI * many[0]).toBeGreaterThanOrEqual(
      30 * ORBIT_GEOMETRY.nodeArc - 0.001,
    )
    // 안쪽 링이 밀리면 바깥 링도 함께 밀린다.
    expect(many[6]).toBeGreaterThan(few[6])
  })
})

describe('layoutOrbit', () => {
  it('같은 링의 인물을 겹치지 않게 균등 각도로 배치한다', () => {
    const { nodes } = layoutOrbit(
      [
        { id: 1, daysSinceLastMeet: 1 },
        { id: 2, daysSinceLastMeet: 4 },
        { id: 3, daysSinceLastMeet: 7 },
      ],
      rings,
    )

    expect(nodes).toHaveLength(3)
    expect(nodes.every((node) => node.ringIndex === 0)).toBe(true)
    const angles = nodes.map((node) => node.angleDeg).sort((a, b) => a - b)
    expect(angles[1] - angles[0]).toBeCloseTo(120, 5)
    expect(angles[2] - angles[1]).toBeCloseTo(120, 5)
  })

  it('같은 링이어도 최근에 만난 사람이 더 안쪽에 앉는다', () => {
    const { nodes, radii } = layoutOrbit(
      [
        { id: 1, daysSinceLastMeet: 1 },
        { id: 2, daysSinceLastMeet: 7 },
      ],
      rings,
    )
    const [recent, older] = nodes
    expect(recent.radius).toBeLessThan(older.radius)
    // 밴드 상한(경과일 최대)은 링 선 위, 당겨지더라도 '나'를 덮지 않는다.
    expect(older.radius).toBeCloseTo(radii[0], 5)
    expect(recent.radius).toBeGreaterThanOrEqual(ORBIT_GEOMETRY.centerClearance)
  })

  it('만남 이력이 없으면 바깥 링 선 위에 둔다', () => {
    const { nodes, radii } = layoutOrbit(
      [{ id: 1, daysSinceLastMeet: null }],
      rings,
    )
    expect(nodes[0].ringIndex).toBe(6)
    expect(nodes[0].radius).toBeCloseTo(radii[6], 5)
  })

  it('같은 입력은 항상 같은 배치를 반환한다', () => {
    const persons = [
      { id: 7, daysSinceLastMeet: 41 },
      { id: 2, daysSinceLastMeet: null },
      { id: 9, daysSinceLastMeet: 400 },
      { id: 4, daysSinceLastMeet: 100 },
    ]
    expect(layoutOrbit(persons, rings)).toEqual(layoutOrbit(persons, rings))
  })

  it('모든 노드가 월드 반경 안에 들어온다', () => {
    const { nodes, worldRadius } = layoutOrbit(
      Array.from({ length: 24 }, (_, index) => ({
        id: index + 1,
        daysSinceLastMeet: index * 60,
      })),
      rings,
    )

    for (const node of nodes) {
      expect(Math.hypot(node.x, node.y)).toBeLessThanOrEqual(worldRadius)
    }
  })

  it('입력이 없어도 링은 남는다', () => {
    const layout = layoutOrbit([], rings)
    expect(layout.nodes).toEqual([])
    expect(layout.radii).toHaveLength(7)
    expect(layout.worldRadius).toBeGreaterThan(0)
  })
})

describe('orbitArcPath', () => {
  it('12시 방향 기준의 원호 경로를 만든다', () => {
    // 반지름 100, -16도~+16도(12시 중심)이면 시작점은 왼쪽 위, 끝점은 오른쪽 위.
    const path = orbitArcPath(100, -16, 16)
    expect(path).toMatch(
      /^M -?[\d.]+ -?[\d.]+ A 100 100 0 0 1 -?[\d.]+ -?[\d.]+$/,
    )
    const [start, end] = path
      .replace(/^M /, '')
      .split(' A 100 100 0 0 1 ')
      .map((point) => point.split(' ').map(Number))
    expect(start[0]).toBeLessThan(0)
    expect(end[0]).toBeGreaterThan(0)
    expect(start[1]).toBeLessThan(0)
    expect(end[1]).toBeLessThan(0)
  })
})

describe('formatDaysSinceLastMeet', () => {
  it('시안 규칙대로 포맷한다', () => {
    expect(formatDaysSinceLastMeet(null)).toBe('기록 없음')
    expect(formatDaysSinceLastMeet(0)).toBe('오늘')
    expect(formatDaysSinceLastMeet(3)).toBe('3일 전')
    expect(formatDaysSinceLastMeet(60)).toBe('60일 전')
    expect(formatDaysSinceLastMeet(92)).toBe('3개월 전')
    expect(formatDaysSinceLastMeet(398)).toBe('약 1년 전')
  })
})

describe('formatKnownDuration', () => {
  it('알고 지낸 시간을 일/개월/년으로 줄인다', () => {
    expect(formatKnownDuration(null)).toBe('—')
    expect(formatKnownDuration(0)).toBe('1일')
    expect(formatKnownDuration(45)).toBe('46일')
    expect(formatKnownDuration(364)).toBe('12개월')
    expect(formatKnownDuration(365 * 3 + 30)).toBe('3년')
  })
})
