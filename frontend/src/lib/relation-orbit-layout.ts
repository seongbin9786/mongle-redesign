// 관계 궤도 지도의 배치 계산. '나'를 중심으로 마지막 만남 시기에 맞는 동심원
// 링 위에 인물을 놓는다 — 위치 자체가 최근성 정보라 범례가 필요 없다.
//
// 좌표계는 중심이 (0,0)인 월드 px다. 링 반경이 인원수에 따라 늘어나므로
// 고정 뷰박스를 쓸 수 없고, 화면에 맞추는 배율은 그리는 쪽이 정한다.

export type OrbitRing = {
  label: string
  /** 이 링에 속하는 '마지막 만남 경과일' 상한(포함). */
  maxDays: number
}

/** 1월 1일부터 오늘까지의 경과일. '올해' 링의 경계를 달력에서 가져온다. */
function daysSinceYearStart(today: Date): number {
  const start = new Date(today.getFullYear(), 0, 1)
  const midnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  return Math.round((midnight.getTime() - start.getTime()) / 86_400_000)
}

/**
 * 링 경계는 라벨의 의미에서 역산한다: 7일 / 1달≈31일 / 3달≈92일 /
 * 올해(달력 1월 1일 이후) / 1년=365일 / 3년≈1095일 / 그 이전.
 *
 * '올해'만 달력 기준이라 연초에는 '3달'보다 짧아져 링 순서가 뒤집힌다.
 * 순서가 뒤집히면 링 배정이 통째로 무너지므로 앞뒤 링 사이로 클램프한다.
 */
export function orbitRings(today: Date = new Date()): OrbitRing[] {
  const yearToDate = Math.min(364, Math.max(93, daysSinceYearStart(today)))
  return [
    { label: '7일', maxDays: 7 },
    { label: '1달', maxDays: 31 },
    { label: '3달', maxDays: 92 },
    { label: '올해', maxDays: yearToDate },
    { label: '1년', maxDays: 365 },
    { label: '3년', maxDays: 1095 },
    { label: '그 이전', maxDays: Number.POSITIVE_INFINITY },
  ]
}

/** 링 지오메트리 상수. 값의 단위는 모두 월드 px다. */
export const ORBIT_GEOMETRY = {
  /** '나' 노드(반경 32)와 첫 링 인물의 아바타(반경 18)가 닿지 않는 거리. */
  innerRadius: 72,
  /** 첫 링의 인물이 안쪽으로 당겨져도 '나'를 덮지 않는 최소 거리. */
  centerClearance: 56,
  /** 인물이 있는 링은 앞 링과 이만큼 벌린다(아바타 + 이름 높이). */
  occupiedGap: 46,
  /** 빈 링도 사라지지 않되 자리는 덜 차지한다. */
  emptyGap: 24,
  /** 노드 하나가 링 둘레에서 차지해야 할 최소 호 길이. */
  nodeArc: 54,
  /** 밴드 안에서 안쪽으로 당겨지는 최대 거리(링끼리 섞이지 않게 상한을 둔다). */
  maxInwardDrift: 20,
  /** 바깥 링 밖으로 이름이 잘리지 않게 두는 여백. */
  outerPadding: 30,
} as const

export function orbitRingIndex(
  daysSinceLastMeet: number | null | undefined,
  rings: OrbitRing[],
): number {
  if (daysSinceLastMeet == null || daysSinceLastMeet < 0) {
    return rings.length - 1
  }
  for (let i = 0; i < rings.length; i += 1) {
    if (daysSinceLastMeet <= rings[i].maxDays) return i
  }
  return rings.length - 1
}

/**
 * 링 반경을 안쪽부터 누적해 정한다. 링 둘레가 인원을 감당하지 못하면
 * 지름을 넓혀서(인원 × nodeArc = 최소 둘레) 그 안에 다 들어가게 한다.
 * 반경이 인원수에 따라 달라지므로 뷰박스도 함께 커진다.
 */
export function orbitRingRadii(counts: readonly number[]): number[] {
  const { innerRadius, occupiedGap, emptyGap, nodeArc } = ORBIT_GEOMETRY
  const radii: number[] = []
  let previous = 0
  counts.forEach((count, index) => {
    const gap = count > 0 ? occupiedGap : emptyGap
    const byGap = index === 0 ? innerRadius : previous + gap
    const byCount = count > 1 ? (count * nodeArc) / (2 * Math.PI) : 0
    const radius = Math.max(byGap, byCount)
    radii.push(radius)
    previous = radius
  })
  return radii
}

/** 0도가 12시 방향, 시계 방향 증가. 중심이 원점인 월드 좌표를 돌려준다. */
export function orbitPolar(radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) }
}

/** 점선 호(멀어진 관계 표시용). 노드가 실제로 앉은 반경 위에 그린다. */
export function orbitArcPath(
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
) {
  const start = orbitPolar(radius, startAngleDeg)
  const end = orbitPolar(radius, endAngleDeg)
  const to = (p: { x: number; y: number }) =>
    `${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  return `M ${to(start)} A ${radius} ${radius} 0 0 1 ${to(end)}`
}

export type OrbitNodeLayout = {
  personId: number
  ringIndex: number
  angleDeg: number
  /** 링 선 위가 아니라 밴드 안쪽으로 당겨진 실제 반경. */
  radius: number
  /** 중심이 (0,0)인 월드 좌표. */
  x: number
  y: number
}

export type OrbitLayout = {
  rings: OrbitRing[]
  /** 링별 바깥 경계 반경. rings와 같은 길이·순서다. */
  radii: number[]
  /** 바깥 여백까지 포함한 월드 반경. 뷰박스 = -R -R 2R 2R. */
  worldRadius: number
  nodes: OrbitNodeLayout[]
}

/**
 * 같은 링 안에서도 마지막 만남이 최근일수록 안쪽에 앉힌다.
 * 링 선은 밴드의 '가장 오래된 쪽' 경계이고, 방금 만난 사람은 거기서
 * 최대 maxInwardDrift만큼 중심 쪽으로 당겨진다 — 링에 못 박히지 않는다.
 */
function bandRadius(
  days: number | null | undefined,
  ringIndex: number,
  rings: OrbitRing[],
  radii: number[],
): number {
  const outer = radii[ringIndex]
  if (days == null || days < 0) return outer
  const lowDays = ringIndex === 0 ? 0 : rings[ringIndex - 1].maxDays
  const highDays = rings[ringIndex].maxDays
  // 마지막 링은 상한이 없어 비율을 못 낸다 — 링 선에 그대로 둔다.
  if (!Number.isFinite(highDays)) return outer
  const span = highDays - lowDays
  const ratio = span > 0 ? (days - lowDays) / span : 1
  const innerEdge =
    ringIndex === 0 ? ORBIT_GEOMETRY.centerClearance : radii[ringIndex - 1]
  const drift = Math.min(
    ORBIT_GEOMETRY.maxInwardDrift,
    (outer - innerEdge) * 0.45,
  )
  return outer - (1 - Math.min(1, Math.max(0, ratio))) * drift
}

/**
 * 인물을 링에 배정하고 같은 링 안에서 겹치지 않게 각도를 나눈다.
 * id 오름차순 정렬 후 균등 분포라 같은 입력은 항상 같은 배치가 나온다.
 * 링마다 시작각을 어긋나게 해 인접 링과 방사 방향으로 줄서지 않게 한다.
 */
export function layoutOrbit(
  persons: ReadonlyArray<{
    id: number
    daysSinceLastMeet: number | null | undefined
  }>,
  rings: OrbitRing[] = orbitRings(),
): OrbitLayout {
  const byRing: Array<Array<(typeof persons)[number]>> = rings.map(() => [])
  for (const person of persons) {
    byRing[orbitRingIndex(person.daysSinceLastMeet, rings)].push(person)
  }

  const radii = orbitRingRadii(byRing.map((ring) => ring.length))

  const nodes: OrbitNodeLayout[] = []
  byRing.forEach((ringPersons, ringIndex) => {
    const sorted = [...ringPersons].sort((a, b) => a.id - b.id)
    const step = 360 / Math.max(sorted.length, 1)
    // 12시 방향은 링 라벨 자리라 첫 노드를 30° 비켜 세운다. 링마다 41°씩 더
    // 돌려 이웃 링의 노드와 방사 방향으로 줄서지 않게 한다(이름표끼리 부딪힌다).
    const startAngle = 30 + ringIndex * 41
    sorted.forEach((person, index) => {
      const angleDeg = (startAngle + index * step) % 360
      const radius = bandRadius(
        person.daysSinceLastMeet,
        ringIndex,
        rings,
        radii,
      )
      const position = orbitPolar(radius, angleDeg)
      nodes.push({
        personId: person.id,
        ringIndex,
        angleDeg,
        radius,
        x: position.x,
        y: position.y,
      })
    })
  })

  return {
    rings,
    radii,
    worldRadius: radii[radii.length - 1] + ORBIT_GEOMETRY.outerPadding,
    nodes: nodes.sort((a, b) => a.personId - b.personId),
  }
}

/** '마지막 만남' 표시. 시안 A의 lastText() 규칙. */
export function formatDaysSinceLastMeet(
  days: number | null | undefined,
): string {
  if (days == null) return '기록 없음'
  if (days <= 0) return '오늘'
  if (days <= 60) return `${days}일 전`
  if (days < 365) return `${Math.round(days / 30.4)}개월 전`
  return `약 ${Math.round(days / 365)}년 전`
}

/** '알고 지낸 시간' 표시. 처음 만난 날부터의 경과일을 사람 말로 줄인다. */
export function formatKnownDuration(days: number | null | undefined): string {
  if (days == null || days < 0) return '—'
  if (days < 90) return `${days + 1}일`
  if (days < 365) return `${Math.max(1, Math.round(days / 30.4))}개월`
  return `${Math.max(1, Math.round(days / 365))}년`
}
