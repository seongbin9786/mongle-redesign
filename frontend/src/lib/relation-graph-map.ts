/**
 * 인물관계도 지도의 자리 계산. **좌표만 다루는 순수 함수**로 모아 둔다 —
 * 캔버스 컴포넌트가 제스처(끌기·팬)와 배치 규칙을 함께 들면, 배치를 고칠 때마다
 * 제스처를 다시 만지게 된다.
 *
 * 좌표계는 '지도 좌표' 하나뿐이다. 화면에 그릴 때만 팬 이동량을 더한다.
 */

export type MapGroup = {
  /** 지도 안에서 하나뿐인 식별자. 관계태그로 만든 영역은 `tag:{chipId}`. */
  key: string
  name: string
  /** 영역 색(hex). 없으면 화면이 무채색으로 그린다. */
  color: string | null
  x: number
  y: number
  width: number
  height: number
}

/** 인물 한 칸의 크기(아바타 52 + 이름). 영역의 크기는 이 칸 수로 정해진다. */
const CELL_WIDTH = 92
const CELL_HEIGHT = 104
/** 영역 안쪽 여백 — 위는 이름표가 앉을 자리라 더 넓다. */
const PAD_X = 16
const PAD_TOP = 44
const PAD_BOTTOM = 14
/** 한 줄에 세 명까지. 더 늘리면 영역이 가로로만 길어져 지도에서 한 덩어리로 안 읽힌다. */
const MAX_COLUMNS = 3
const MAP_PAD = 24
const GAP = 28

export const MAP_MIN_GROUP_WIDTH = PAD_X * 2 + CELL_WIDTH
export const MAP_MIN_GROUP_HEIGHT = PAD_TOP + CELL_HEIGHT + PAD_BOTTOM

function gridOf(count: number) {
  const columns = Math.min(
    MAX_COLUMNS,
    Math.max(1, Math.ceil(Math.sqrt(count))),
  )
  return { columns, rows: Math.max(1, Math.ceil(count / columns)) }
}

/** 인원수에 맞춘 영역 크기. 사람이 늘면 영역도 자란다(넘쳐 흐르지 않는다). */
export function groupSize(count: number) {
  const { columns, rows } = gridOf(count)
  return {
    width: PAD_X * 2 + columns * CELL_WIDTH,
    height: PAD_TOP + rows * CELL_HEIGHT + PAD_BOTTOM,
  }
}

/** 인물 한 명이 지도에서 차지하는 반경(아바타 반지름 + 이름표). 겹침을 따질 때 쓴다. */
const NODE_EXTENT = 34

export type MapPoint = { x: number; y: number }

/**
 * 이미 무언가 놓여 있는 범위. **영역과 인물을 함께** 본다 —
 * 영역만 보고 자리를 잡으면 들판에 흩어 둔 사람들 위로 새 구역이 덮인다.
 */
function occupied(groups: MapGroup[], nodes: MapPoint[]) {
  const rights = [
    ...groups.map((group) => group.x + group.width),
    ...nodes.map((node) => node.x + NODE_EXTENT),
  ]
  const bottoms = [
    ...groups.map((group) => group.y + group.height),
    ...nodes.map((node) => node.y + NODE_EXTENT),
  ]
  return {
    right: rights.length > 0 ? Math.max(...rights) : 0,
    bottom: bottoms.length > 0 ? Math.max(...bottoms) : 0,
  }
}

/**
 * 새 영역이 놓일 자리 — 지금까지 놓인 것 **전부의 오른쪽**. 겹쳐 놓으면 어느 구역인지 알 수 없고,
 * 사람 위에 구역이 덮이면 그 사람이 그 무리인 줄 알게 된다(지도에서는 위치가 곧 소속이다).
 */
export function nextGroupOrigin(groups: MapGroup[], nodes: MapPoint[] = []) {
  const { right } = occupied(groups, nodes)
  return { x: right === 0 ? MAP_PAD : right + GAP, y: MAP_PAD }
}

/** 영역 안 n번째 인물의 자리(노드 중심). */
export function memberPosition(group: MapGroup, index: number, count: number) {
  const { columns } = gridOf(count)
  const column = index % columns
  const row = Math.floor(index / columns)
  return {
    x: group.x + PAD_X + column * CELL_WIDTH + CELL_WIDTH / 2,
    y: group.y + PAD_TOP + row * CELL_HEIGHT + CELL_HEIGHT / 2,
  }
}

/** 어느 영역에도 안 든 인물이 놓이는 곳 — 지금까지 놓인 것 **아래**의 빈 들판. */
export function freePosition(
  index: number,
  groups: MapGroup[],
  nodes: MapPoint[] = [],
) {
  const { bottom } = occupied(groups, nodes)
  const top = bottom === 0 ? MAP_PAD : bottom + GAP
  return {
    x: MAP_PAD + (index % MAX_COLUMNS) * CELL_WIDTH + CELL_WIDTH / 2,
    y: top + Math.floor(index / MAX_COLUMNS) * CELL_HEIGHT + CELL_HEIGHT / 2,
  }
}

/**
 * 그 자리를 품는 영역. 겹쳐 있으면 **나중 것**이 이긴다 — 위에 그려진 영역이
 * 손끝에 보이는 영역이기 때문이다.
 */
export function groupAt(groups: MapGroup[], x: number, y: number) {
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]
    if (
      x >= group.x &&
      x <= group.x + group.width &&
      y >= group.y &&
      y <= group.y + group.height
    ) {
      return group.key
    }
  }
  return null
}

/** 지도를 보는 창(밀린 만큼 + 배율). 화면 좌표 = 지도 좌표 × scale + (x, y). */
export type MapView = { x: number; y: number; scale: number }

export const MAP_VIEW_DEFAULT: MapView = { x: 0, y: 0, scale: 1 }
/** 배율 한계. 더 줄이면 얼굴이 점이 되고, 더 키우면 한 사람만 남아 지도가 아니게 된다. */
export const MAP_SCALE_MIN = 0.4
export const MAP_SCALE_MAX = 2

export function clampScale(scale: number) {
  if (!Number.isFinite(scale)) return 1
  return Math.min(MAP_SCALE_MAX, Math.max(MAP_SCALE_MIN, scale))
}

/**
 * 초점(화면 좌표)을 붙잡은 채 배율만 바꾼다 — 두 손가락 사이나 커서 아래에 있던 곳이
 * 그대로 있어야 '내가 그 자리를 확대했다'로 읽힌다.
 */
export function zoomAt(view: MapView, scale: number, focus: MapPoint): MapView {
  const next = clampScale(scale)
  const ratio = next / view.scale
  return {
    scale: next,
    x: focus.x - (focus.x - view.x) * ratio,
    y: focus.y - (focus.y - view.y) * ratio,
  }
}
