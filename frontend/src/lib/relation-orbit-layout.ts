// 관계 궤도 지도의 배치 계산. '나'를 중심으로 마지막 만남 시기에 맞는 자리에
// 인물을 놓는다 — 위치 자체가 최근성 정보라 범례가 필요 없다.
//
// 좌표계는 중심이 (0,0)인 월드 px다. 축이 인원수에 따라 늘어나므로 고정
// 뷰박스를 쓸 수 없고, 화면에 맞추는 배율은 그리는 쪽이 정한다.

export type OrbitRing = {
  label: string
  /** 이 눈금에 속하는 '마지막 만남 경과일' 상한(포함). */
  maxDays: number
}

/** 1월 1일부터 오늘까지의 경과일. '올해' 눈금의 경계를 달력에서 가져온다. */
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
 * 눈금 경계는 라벨의 의미에서 역산한다: 7일 / 1달≈31일 / 3달≈92일 /
 * 올해(달력 1월 1일 이후) / 1년=365일 / 3년≈1095일 / 그 이전.
 *
 * '올해'만 달력 기준이라 연초에는 '3달'보다 짧아져 순서가 뒤집힌다.
 * 순서가 뒤집히면 배정이 통째로 무너지므로 앞뒤 눈금 사이로 클램프한다.
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

/** 궤도 지오메트리 상수. 값의 단위는 모두 월드 px다. */
export const ORBIT_GEOMETRY = {
  /**
   * '나'(반경 32) 밖에 인물 노드(반경 20)가 겨우 서는 거리. 여기가 곧
   * '오늘'이라, 필요 이상으로 벌리면 오늘 만난 사람이 멀어 보인다.
   */
  innerRadius: 58,
  /** 축 전체의 '기간 비례' 예산. maxDays 어치를 이 길이에 나눠 담는다. */
  span: 430,
  /** 축의 끝. 이보다 오래됐거나 만남 기록이 없으면 테두리에 앉는다. */
  maxDays: 1460,
  /** 구간이 아무리 짧아도 이만큼은 벌린다(아바타 + 이름 높이). */
  minBandGap: 46,
  /** 노드 하나가 둘레에서 차지해야 할 최소 호 길이. */
  nodeArc: 58,
  /** 붐빌 때 축 전체를 늘리는 한도. 남은 붐빔은 노드 크기·이름이 흡수한다. */
  maxStretch: 2.2,
  /** 한 구간에서 여러 줄로 앉힐 때의 줄 간격 상한. */
  rowGap: 46,
  /** 바깥으로 이름이 잘리지 않게 두는 여백. */
  outerPadding: 32,
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

export type OrbitBand = {
  /** 이 구간이 담는 경과일 범위 (low, high]. */
  low: number
  high: number
  /** 구간의 안쪽·바깥쪽 반경. 바깥쪽이 곧 눈금 선이다. */
  inner: number
  outer: number
}

/**
 * 구간 두께 = max(최소 간격, 기간 비례).
 *
 * 축 전체를 눌러 담으면(로그·멱함수) 붙어야 할 곳까지 눌린다. 대신 자리가
 * 있는 구간은 기간에 그대로 비례해 벌리고, 그대로 두면 무너질 구간(0~7일 등)
 * 에만 바닥을 깔아 준다. 구간 '안'에서는 여전히 경과일에 선형이라
 * 3일과 6일은 정확히 두 배 떨어진다.
 */
export function orbitBands(rings: OrbitRing[], stretch = 1): OrbitBand[] {
  const { span, maxDays, minBandGap, innerRadius } = ORBIT_GEOMETRY
  let cursor = innerRadius
  return rings.map((ring, index) => {
    const low = index === 0 ? 0 : rings[index - 1].maxDays
    const high = Number.isFinite(ring.maxDays) ? ring.maxDays : maxDays
    const proportional = (span * stretch * (high - low)) / maxDays
    const thickness = Math.max(minBandGap * stretch, proportional)
    const band = { low, high, inner: cursor, outer: cursor + thickness }
    cursor += thickness
    return band
  })
}

/** 경과일 → 반경. 같은 경과일은 데이터가 뭐든 늘 같은 자리에 앉는다. */
export function radiusInBands(
  days: number | null | undefined,
  bands: OrbitBand[],
): number {
  const last = bands[bands.length - 1]
  if (days == null || days < 0) return last.outer
  for (const band of bands) {
    if (days <= band.high) {
      const ratio =
        band.high > band.low ? (days - band.low) / (band.high - band.low) : 1
      return (
        band.inner + (band.outer - band.inner) * Math.min(1, Math.max(0, ratio))
      )
    }
  }
  return last.outer
}

/**
 * 사람이 한 반경에 몰리면 그 구간만 부풀리는 대신 축 전체를 같은 비율로
 * 늘린다 — 구간마다 따로 부풀리면 '같은 시간 = 같은 자리'가 데이터마다 깨진다.
 */
function fitStretch(
  daysList: ReadonlyArray<number | null | undefined>,
  rings: OrbitRing[],
): number {
  const { nodeArc, minBandGap, maxStretch } = ORBIT_GEOMETRY
  let stretch = 1
  for (let pass = 0; pass < 3; pass += 1) {
    const bands = orbitBands(rings, stretch)
    const radii = daysList
      .map((days) => radiusInBands(days, bands))
      .sort((a, b) => a - b)
    let need = 1
    let i = 0
    while (i < radii.length) {
      let j = i
      while (j + 1 < radii.length && radii[j + 1] - radii[i] < minBandGap)
        j += 1
      const count = j - i + 1
      if (count > 1) {
        const required = (count * nodeArc) / (2 * Math.PI)
        need = Math.max(need, required / Math.max(radii[i], 1))
      }
      i = j + 1
    }
    if (need <= 1.001) break
    stretch = Math.min(stretch * Math.min(need, 1.7), maxStretch)
    if (stretch >= maxStretch) break
  }
  return stretch
}

export type OrbitNodeLayout = {
  personId: number
  ringIndex: number
  angleDeg: number
  radius: number
  /** 중심이 (0,0)인 월드 좌표. */
  x: number
  y: number
}

export type OrbitLayout = {
  rings: OrbitRing[]
  /** 눈금 선의 반경. rings와 같은 길이·순서다. */
  radii: number[]
  /** 바깥 여백까지 포함한 월드 반경. 뷰박스 = -R -R 2R 2R. */
  worldRadius: number
  /**
   * 사람이 실제로 앉아 있는 가장 바깥 눈금까지의 반경(+여백).
   * 기본 배율은 이 값에 맞춘다 — 아무도 없는 바깥까지 담으려고 배율을
   * 낮추면 정작 사람이 다 작아진다.
   */
  focusRadius: number
  nodes: OrbitNodeLayout[]
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

/**
 * id에서 뽑은 고정 흔들림(-0.5~0.5). 각도를 딱 균등하게 놓으면 얼굴이
 * 목걸이처럼 박혀 보인다. 난수가 아니라 id의 함수라 배치는 항상 재현된다.
 */
function wobble(id: number): number {
  const x = Math.sin(id * 12.9898) * 43758.5453
  return x - Math.floor(x) - 0.5
}

/**
 * 인물을 경과일에 맞는 반경에 앉히고, 같은 구간 안에서 겹치지 않게 각도를
 * 나눈다. 인원이 둘레를 넘으면 한 줄에 밀어 넣지 않고 구간 두께를 나눠 여러
 * 줄로 앉힌다(안쪽 줄일수록 최근). 같은 입력은 항상 같은 배치가 나온다.
 */
export function layoutOrbit(
  persons: ReadonlyArray<{
    id: number
    daysSinceLastMeet: number | null | undefined
  }>,
  rings: OrbitRing[] = orbitRings(),
): OrbitLayout {
  const stretch = fitStretch(
    persons.map((person) => person.daysSinceLastMeet),
    rings,
  )
  const bands = orbitBands(rings, stretch)
  const radii = bands.map((band) => band.outer)

  const byRing: Array<Array<(typeof persons)[number]>> = rings.map(() => [])
  for (const person of persons) {
    byRing[orbitRingIndex(person.daysSinceLastMeet, rings)].push(person)
  }

  const nodes: OrbitNodeLayout[] = []
  byRing.forEach((ringPersons, ringIndex) => {
    if (ringPersons.length === 0) return
    const band = bands[ringIndex]

    // 최근 순으로 세우고 안쪽 줄부터 채운다.
    const sorted = [...ringPersons].sort((a, b) => {
      const da = a.daysSinceLastMeet ?? Number.POSITIVE_INFINITY
      const db = b.daysSinceLastMeet ?? Number.POSITIVE_INFINITY
      return da === db ? a.id - b.id : da - db
    })

    const perRow = Math.max(
      3,
      Math.floor((2 * Math.PI * band.outer) / ORBIT_GEOMETRY.nodeArc),
    )
    const rows = Math.max(1, Math.min(4, Math.ceil(sorted.length / perRow)))
    const rowGap =
      rows > 1
        ? Math.min(ORBIT_GEOMETRY.rowGap, (band.outer - band.inner) / rows)
        : 0
    const rowRadii = Array.from(
      { length: rows },
      (_, row) => band.outer - (rows - 1 - row) * rowGap,
    )

    // 줄마다 둘레에 비례해 인원을 나눈다. 안쪽 줄은 좁으니 덜 앉힌다.
    const weightSum = rowRadii.reduce((a, b) => a + b, 0)
    const counts = rowRadii.map((radius) =>
      Math.max(1, Math.round((sorted.length * radius) / weightSum)),
    )
    let drift = sorted.length - counts.reduce((a, b) => a + b, 0)
    for (let i = counts.length - 1; drift !== 0 && i >= 0; i -= 1) {
      const step = drift > 0 ? 1 : -1
      if (counts[i] + step >= 1) {
        counts[i] += step
        drift -= step
      }
    }

    let cursor = 0
    rowRadii.forEach((rowRadius, row) => {
      const members = sorted.slice(cursor, cursor + counts[row])
      cursor += counts[row]
      const step = 360 / Math.max(members.length, 1)
      // 12시 방향은 눈금 라벨 자리라 첫 노드를 30° 비켜 세우고, 구간마다
      // 41°씩 더 돌려 이웃 구간과 방사 방향으로 줄서지 않게 한다.
      const startAngle = 30 + ringIndex * 41 + row * 19
      members.forEach((person, index) => {
        const jitter = members.length > 2 ? wobble(person.id) * step * 0.34 : 0
        const angleDeg = (startAngle + index * step + jitter + 360) % 360
        const radius =
          rows > 1
            ? rowRadius + wobble(person.id + 977) * 5
            : radiusInBands(person.daysSinceLastMeet, bands)
        const at = orbitPolar(radius, angleDeg)
        nodes.push({
          personId: person.id,
          ringIndex,
          angleDeg,
          radius,
          x: at.x,
          y: at.y,
        })
      })
    })
  })

  let outermostOccupied = -1
  byRing.forEach((ringPersons, index) => {
    if (ringPersons.length > 0) outermostOccupied = index
  })

  return {
    rings,
    radii,
    worldRadius: radii[radii.length - 1] + ORBIT_GEOMETRY.outerPadding,
    focusRadius:
      (outermostOccupied >= 0 ? radii[outermostOccupied] : radii[0]) +
      ORBIT_GEOMETRY.outerPadding,
    nodes: nodes.sort((a, b) => a.personId - b.personId),
  }
}

/**
 * 노드마다 '가장 가까운 이웃까지의 거리'. 붐빔은 구간 단위로 재면 틀린다 —
 * 구간이 달라도 각도가 겹치면 얼굴은 붙는다. 이름 표시와 노드 크기가
 * 이 하나의 값에서 나온다.
 *
 * verticalSquash는 판을 눕혔을 때 세로가 눌리는 비율(cos θ)이다. 눌리기 전
 * 거리로 재면 실제보다 여유 있다고 착각한다.
 */
export function nearestNeighbourGaps(
  nodes: ReadonlyArray<Pick<OrbitNodeLayout, 'personId' | 'x' | 'y'>>,
  verticalSquash = 1,
): Map<number, number> {
  const gaps = new Map<number, number>()
  for (const node of nodes) {
    let nearest = Number.POSITIVE_INFINITY
    for (const other of nodes) {
      if (other === node) continue
      const distance = Math.hypot(
        node.x - other.x,
        (node.y - other.y) * verticalSquash,
      )
      if (distance < nearest) nearest = distance
    }
    gaps.set(node.personId, nearest)
  }
  return gaps
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
