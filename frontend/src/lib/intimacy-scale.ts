import { RELATION_TAG_COLOR_OPTIONS } from '@/lib/relation-tag-colors'

/**
 * 인물관계도의 친밀도 눈금(0~100)과 그 색. 선 색·바 색·손잡이 색이 한 곳에서 나와야
 * "같은 값인데 화면마다 다른 색"이 생기지 않는다.
 *
 * 색은 **세 지점**을 지난다: 파랑(먼 사이) → 앱 기본 먹색(가운데) → 빨강(가까운 사이).
 * 가운데를 무채색으로 두면 "아직 어느 쪽도 아니다"가 색으로 읽히고, 양쪽 색이 서로를
 * 흐리게 만드는 보라 구간도 사라진다.
 *
 * 양 끝 색은 새로 뽑지 않고 관계태그 팔레트에서 가져온다 — 앱 안의 색은 그 목록이 전부이고,
 * 여기서만 쓰는 파랑·빨강을 따로 정의하면 팔레트가 두 벌이 된다.
 * 가운데 색도 같은 이유로 토큰(`--foreground` = `--gyeol-ink-90`)을 그대로 쓴다.
 * 값을 hex 로 베껴 두면 테마 토큰이 바뀔 때 여기만 옛 색으로 남는다.
 */
const colorOf = (label: string) => {
  const found = RELATION_TAG_COLOR_OPTIONS.find(
    (option) => option.label === label,
  )
  // 팔레트에서 이름이 사라지면 색이 조용히 틀리는 대신 바로 드러나야 한다.
  if (!found) throw new Error(`팔레트에 '${label}' 색이 없습니다.`)
  return found.value
}

/** 0(먼 사이) — 팔레트 '블루'. */
export const INTIMACY_LOW_COLOR = colorOf('블루')
/** 50(아직 어느 쪽도 아님) — 앱 기본 먹색. */
export const INTIMACY_MID_COLOR = 'var(--foreground)'
/** 100(가까운 사이) — 팔레트 '코랄'. */
export const INTIMACY_HIGH_COLOR = colorOf('코랄')

export const INTIMACY_MIN = 0
export const INTIMACY_MAX = 100
/** 새 연결의 기본값. 가운데에서 시작해야 올리는 쪽·내리는 쪽 어느 손짓도 같은 거리다. */
export const INTIMACY_DEFAULT = 50

export function clampIntimacy(value: number) {
  if (!Number.isFinite(value)) return INTIMACY_DEFAULT
  return Math.min(INTIMACY_MAX, Math.max(INTIMACY_MIN, Math.round(value)))
}

/**
 * 낮을수록 파랑, 높을수록 빨강, 가운데는 먹색. 단계를 나누지 않고 이어서 섞는다 —
 * 값이 연속이니 색도 연속이어야 손끝과 눈이 같이 움직인다.
 *
 * 섞는 일을 JS 가 아니라 CSS(color-mix)에 맡기는 건 가운데 색이 **토큰**이기 때문이다.
 * hex 로 바꿔 계산하려면 토큰 값을 코드에 베껴 와야 하고, 그 순간 테마와 갈린다.
 * oklab 에서 섞어야 중간 구간이 탁해지지 않는다.
 * 반환값은 CSS 색 문자열이라 **style 속성으로만** 넘긴다(SVG presentation attribute 아님).
 */
export function intimacyColor(intimacy: number) {
  const level = clampIntimacy(intimacy)
  const half = INTIMACY_MAX / 2
  if (level <= half) {
    const ratio = (level / half) * 100
    return `color-mix(in oklab, ${INTIMACY_MID_COLOR} ${ratio}%, ${INTIMACY_LOW_COLOR})`
  }
  const ratio = ((level - half) / half) * 100
  return `color-mix(in oklab, ${INTIMACY_HIGH_COLOR} ${ratio}%, ${INTIMACY_MID_COLOR})`
}

/** 선 굵기도 친밀도를 따라간다 — 색만으로는 색약·흑백 화면에서 두 선이 같아 보인다. */
export function intimacyStrokeWidth(intimacy: number) {
  return 1.5 + (clampIntimacy(intimacy) / INTIMACY_MAX) * 3
}
