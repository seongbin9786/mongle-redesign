import type {
  PersonNode,
  ZoneResponse,
} from '@/apis/generated/mongle-api.schemas'

// 홈은 관계 지도를 한 번만 받고, 좌우 스와이프로 넘기는 '우주'는 여기서 나눈다.
// 우주를 넘길 때마다 서버를 다녀오면 스와이프 도중 지도가 비어 은유가 깨진다.

/** 존이 아닌 가상 우주('전체')의 id. 존 id(number)와 섞이지 않게 문자열을 쓴다. */
export const ALL_UNIVERSE_ID = 'all'
/** 마지막 장 — 존을 만들러 가는 안내 우주. 서버에 대응물이 없다. */
export const CREATE_UNIVERSE_ID = 'create'

/**
 * 존 개수 상한. 서버(ValidationLimits.ZONE_MAX)와 같은 값이어야 한다 —
 * 상한에 닿으면 만들기 우주를 접어야 하는데, 여기 값이 크면 눌러도 실패하는 장이 남는다.
 */
export const ZONE_MAX = 12

export type Universe = {
  /** 'all' · `zone:{id}` · 'create'. 렌더 key·전환 애니메이션 트리거로 쓴다. */
  id: string
  /** 전체 / 존 / 만들기 안내. 화면이 무엇을 그릴지 가르는 축이다. */
  kind: 'all' | 'zone' | 'create'
  name: string
  /** 존 색(hex). '전체'와 색 없는 존은 null이라 무채색으로 그린다. */
  color: string | null
  /** 존이면 그 존의 id. 나머지는 null. */
  zoneId: number | null
  nodes: PersonNode[]
}

/**
 * 우주 목록 = `전체` + 존 순서대로 + `새 우주 만들기`.
 *
 * - **첫 장은 늘 `전체`다.** 존을 하나도 만들지 않은 사용자(대다수의 첫 화면)에게
 *   홈이 빈 우주로 시작하면 안 되고, 존을 다 지웠을 때 돌아올 자리도 필요하다.
 * - **마지막 장은 늘 `만들기`다.** 존이 0개여도 옆으로 넘길 곳이 있어야 스와이프가
 *   있다는 사실 자체가 드러난다 — 설정에 들어가 본 사람만 아는 기능이 되면 안 된다.
 *   존 상한(ZONE_MAX)에 닿으면 이 장을 접는다(눌러도 실패할 장을 남기지 않는다).
 * - **비어 있는 존도 우주로 남긴다.** 존을 만들고 아직 사람을 안 담은 상태는 정상이고,
 *   여기서 접어 버리면 "방금 만든 존이 홈에 없다"가 된다(빈 안내는 화면이 맡는다).
 * - 존 안의 인물 순서(personIds)는 배치에 영향을 주지 않는다 — 궤도 자리는 경과일이
 *   정한다(mustpass orbit-home-gyeol). 그래서 노드 순서는 관계 지도 응답 순서를 따른다.
 */
export function buildUniverses(
  nodes: PersonNode[],
  zones: ZoneResponse[],
): Universe[] {
  const all: Universe = {
    id: ALL_UNIVERSE_ID,
    kind: 'all',
    name: '전체',
    color: null,
    zoneId: null,
    nodes,
  }
  const zoneUniverses: Universe[] = zones.map((zone) => {
    const memberIds = new Set(zone.personIds)
    return {
      id: `zone:${zone.id}`,
      kind: 'zone',
      name: zone.name,
      color: zone.color ?? null,
      zoneId: zone.id,
      nodes: nodes.filter((node) => memberIds.has(node.id)),
    }
  })
  if (zones.length >= ZONE_MAX) return [all, ...zoneUniverses]

  const create: Universe = {
    id: CREATE_UNIVERSE_ID,
    kind: 'create',
    // 존이 없을 때와 있을 때 이름이 다르다 — 첫 사용자에게는 '무엇을 만드는지'가,
    // 이미 만든 사용자에게는 '더 만들 수 있다'가 필요한 말이다.
    name: zones.length === 0 ? '존 만들기' : '새 우주',
    color: null,
    zoneId: null,
    nodes: [],
  }
  return [all, ...zoneUniverses, create]
}

/**
 * 좌우 순환 없이 양 끝에서 멈춘다. 우주는 목록이라 끝이 있고, 순환시키면
 * '전체'로 돌아온 건지 한 바퀴 돈 건지 구분되지 않는다(인디케이터가 유일한 단서다).
 */
export function nextUniverseIndex(
  current: number,
  direction: 1 | -1,
  count: number,
) {
  if (count <= 0) return 0
  return Math.min(count - 1, Math.max(0, current + direction))
}
