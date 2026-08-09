import { describe, expect, it } from 'vitest'
import {
  ORBIT_GEOMETRY,
  formatDaysSinceLastMeet,
  formatKnownDuration,
  layoutOrbit,
  nearestNeighbourGaps,
  orbitBands,
  orbitRingIndex,
  orbitRings,
  radiusInBands,
} from './relation-orbit-layout'

// 테스트는 '올해' 경계가 달력에 흔들리지 않도록 고정 날짜의 눈금을 쓴다.
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
  it('경계값에서 눈금 라벨의 의미대로 배정한다', () => {
    expect(orbitRingIndex(0, rings)).toBe(0)
    expect(orbitRingIndex(7, rings)).toBe(0)
    expect(orbitRingIndex(8, rings)).toBe(1)
    expect(orbitRingIndex(92, rings)).toBe(2)
    expect(orbitRingIndex(93, rings)).toBe(3)
    expect(orbitRingIndex(365, rings)).toBe(4)
    expect(orbitRingIndex(1096, rings)).toBe(6)
  })

  it('만남 이력이 없거나 유효하지 않으면 가장 바깥에 둔다', () => {
    expect(orbitRingIndex(null, rings)).toBe(6)
    expect(orbitRingIndex(undefined, rings)).toBe(6)
    expect(orbitRingIndex(-3, rings)).toBe(6)
  })
})

describe('orbitBands', () => {
  const bands = orbitBands(rings)

  it('첫 구간은 나 노드 바깥에서 시작하고 구간이 끊기지 않는다', () => {
    expect(bands[0].inner).toBe(ORBIT_GEOMETRY.innerRadius)
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i].inner).toBeCloseTo(bands[i - 1].outer, 5)
    }
  })

  it('두께는 최소 간격 밑으로 내려가지 않는다', () => {
    for (const band of bands) {
      expect(band.outer - band.inner).toBeGreaterThanOrEqual(
        ORBIT_GEOMETRY.minBandGap - 0.001,
      )
    }
  })

  it('자리가 있는 구간은 기간에 비례해 벌어진다', () => {
    // 3년 구간(365~1095일, 730일)은 최소 간격이 아니라 비례가 이긴다.
    const long = bands[5]
    const expected =
      (ORBIT_GEOMETRY.span * (1095 - 365)) / ORBIT_GEOMETRY.maxDays
    expect(long.outer - long.inner).toBeCloseTo(expected, 5)
    expect(expected).toBeGreaterThan(ORBIT_GEOMETRY.minBandGap)
  })

  it('stretch는 축 전체를 같은 비율로 늘린다', () => {
    const stretched = orbitBands(rings, 2)
    for (let i = 0; i < bands.length; i += 1) {
      const base = bands[i].outer - bands[i].inner
      expect(stretched[i].outer - stretched[i].inner).toBeCloseTo(base * 2, 5)
    }
  })
})

describe('radiusInBands', () => {
  const bands = orbitBands(rings)

  it('오늘 만난 사람은 나 바로 바깥에 앉는다', () => {
    expect(radiusInBands(0, bands)).toBeCloseTo(ORBIT_GEOMETRY.innerRadius, 5)
  })

  it('구간 안에서는 경과일에 그대로 비례한다', () => {
    // 0~7일 구간에서 3.5일은 정확히 절반 지점.
    const half = radiusInBands(3.5, bands)
    expect(half).toBeCloseTo((bands[0].inner + bands[0].outer) / 2, 5)
  })

  it('구간의 상한은 그 눈금 선 위다', () => {
    expect(radiusInBands(7, bands)).toBeCloseTo(bands[0].outer, 5)
    expect(radiusInBands(365, bands)).toBeCloseTo(bands[4].outer, 5)
  })

  it('만남 기록이 없으면 테두리에 앉는다', () => {
    expect(radiusInBands(null, bands)).toBeCloseTo(
      bands[bands.length - 1].outer,
      5,
    )
  })
})

describe('layoutOrbit', () => {
  it('같은 경과일은 데이터가 달라도 같은 반경에 앉는다', () => {
    const alone = layoutOrbit([{ id: 1, daysSinceLastMeet: 300 }], rings)
    const withOthers = layoutOrbit(
      [
        { id: 1, daysSinceLastMeet: 300 },
        { id: 2, daysSinceLastMeet: 5 },
        { id: 3, daysSinceLastMeet: 800 },
      ],
      rings,
    )
    expect(withOthers.nodes[0].radius).toBeCloseTo(alone.nodes[0].radius, 5)
  })

  it('최근에 만난 사람이 더 안쪽에 앉는다', () => {
    const { nodes } = layoutOrbit(
      [
        { id: 1, daysSinceLastMeet: 2 },
        { id: 2, daysSinceLastMeet: 40 },
        { id: 3, daysSinceLastMeet: 900 },
      ],
      rings,
    )
    expect(nodes[0].radius).toBeLessThan(nodes[1].radius)
    expect(nodes[1].radius).toBeLessThan(nodes[2].radius)
  })

  it('한 구간에 인원이 몰리면 축 전체가 같은 비율로 늘어난다', () => {
    const few = layoutOrbit(
      Array.from({ length: 3 }, (_, i) => ({
        id: i + 1,
        daysSinceLastMeet: 3,
      })),
      rings,
    )
    const many = layoutOrbit(
      Array.from({ length: 40 }, (_, i) => ({
        id: i + 1,
        daysSinceLastMeet: 3,
      })),
      rings,
    )
    // 구간 하나만 부풀지 않고 모든 구간이 같은 비율로 늘어난다.
    // ('나' 여백은 노드 크기가 정하는 고정값이라 축과 함께 늘어나지 않는다.)
    const inner = ORBIT_GEOMETRY.innerRadius
    const ratio = (many.radii[0] - inner) / (few.radii[0] - inner)
    expect(ratio).toBeGreaterThan(1)
    expect((many.radii[6] - inner) / (few.radii[6] - inner)).toBeCloseTo(
      ratio,
      5,
    )
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
      Array.from({ length: 48 }, (_, index) => ({
        id: index + 1,
        daysSinceLastMeet: index * 30,
      })),
      rings,
    )
    for (const node of nodes) {
      expect(Math.hypot(node.x, node.y)).toBeLessThanOrEqual(worldRadius)
    }
  })

  it('입력이 없어도 눈금은 남는다', () => {
    const layout = layoutOrbit([], rings)
    expect(layout.nodes).toEqual([])
    expect(layout.radii).toHaveLength(7)
    expect(layout.worldRadius).toBeGreaterThan(0)
  })
})

describe('nearestNeighbourGaps', () => {
  const nodes = [
    { personId: 1, x: 0, y: 0 },
    { personId: 2, x: 30, y: 0 },
    { personId: 3, x: 0, y: 100 },
  ]

  it('가장 가까운 이웃까지의 거리를 잰다', () => {
    const gaps = nearestNeighbourGaps(nodes)
    expect(gaps.get(1)).toBeCloseTo(30, 5)
    expect(gaps.get(3)).toBeCloseTo(100, 5)
  })

  it('세로가 눌리면 그만큼 가까워진 것으로 잰다', () => {
    const gaps = nearestNeighbourGaps(nodes, 0.5)
    expect(gaps.get(3)).toBeCloseTo(50, 5)
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
