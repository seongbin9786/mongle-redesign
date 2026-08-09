import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

// 궤도 지도의 줌·팬. 홈은 세로 스크롤이 없으므로(스크롤 대신 줌으로 본다)
// 지도가 스스로 컨테이너에 맞춰 들어가고, 더 보고 싶으면 확대해서 본다.
//
// 배율은 '기본 배율(base) × 사용자 배수(zoom)'로 나눠 둔다. 사람이 늘어
// 월드가 커지거나 화면이 회전해도 base만 다시 계산되면 되고, 사용자가 만진
// 배수는 그대로 남는다.

const MAX_ZOOM = 4
/**
 * 기본 배율의 하한. 링이 7단이라 '전부 담기'만 따르면 폰 폭에서 배율이
 * 0.45까지 떨어져 아무것도 읽히지 않는다. 사람이 읽히는 크기를 먼저 지키고,
 * 다 안 들어오면 밖으로 넘긴다(축소해서 볼 수 있다).
 */
const MIN_BASE_SCALE = 0.72
/** 사람이 적어 지도가 텅 비면 과하게 확대되지 않게 두는 상한. */
const MAX_BASE_SCALE = 1.25
/**
 * 이만큼 넘게 움직였으면 탭이 아니라 팬으로 본다(노드 클릭 억제).
 * 관계 카드 시트의 '바깥 탭 = 닫기'도 같은 기준을 써야 한다 — 기준이 어긋나면
 * 지도를 끄는 손짓이 시트에게는 바깥 탭으로 읽혀 시트가 닫힌다.
 */
export const PAN_THRESHOLD_PX = 6
/** 가장자리에서 살짝 더 끌 수 있게 두는 여유. 완전히 고정되면 뻣뻣하다. */
const PAN_SLACK_PX = 24

type Point = { x: number; y: number }
type View = { zoom: number; tx: number; ty: number }

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function useOrbitViewport(worldRadius: number, focusRadius: number) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [view, setView] = useState<View>({ zoom: 1, tx: 0, ty: 0 })

  // 첫 크기는 레이아웃 직후 직접 잰다. ResizeObserver의 첫 통지만 믿으면
  // 마운트 시점에 따라 0x0으로 시작해 배율이 1에 묶인 채 남는 경우가 있다.
  // 같은 값이면 상태를 갈아끼우지 않아 관찰→렌더→관찰 루프도 생기지 않는다.
  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const measure = () => {
      const { width, height } = element.getBoundingClientRect()
      setBox((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const worldSize = worldRadius * 2
  const shorterSide =
    box.width > 0 && box.height > 0 ? Math.min(box.width, box.height) : 0
  // 기본 배율은 '사람이 있는 곳까지'를 담고, 읽히는 크기를 하한으로 지킨다.
  const baseScale = shorterSide
    ? clamp(shorterSide / (focusRadius * 2), MIN_BASE_SCALE, MAX_BASE_SCALE)
    : 1
  // 바깥 빈 링까지 전부 담기는 배율. 여기까지는 축소할 수 있어야 한다.
  const wholeScale = shorterSide ? shorterSide / worldSize : 1
  const minZoom = Math.min(1, wholeScale / baseScale)
  const scale = baseScale * view.zoom

  // 포인터 핸들러는 이벤트마다 최신 값이 필요한데 클로저는 렌더 시점에 얼어붙는다.
  // 상태를 ref로 미러링해 핸들러가 항상 지금 값을 읽게 한다.
  const latest = useRef({ baseScale, minZoom, worldSize, box, view })
  latest.current = { baseScale, minZoom, worldSize, box, view }

  const clampView = useCallback((next: View): View => {
    const {
      baseScale: base,
      minZoom: floor,
      worldSize: size,
      box: viewport,
    } = latest.current
    const zoom = clamp(next.zoom, floor, MAX_ZOOM)
    const painted = size * base * zoom
    const overflowX = Math.max(0, (painted - viewport.width) / 2)
    const overflowY = Math.max(0, (painted - viewport.height) / 2)
    const limitX = overflowX + (overflowX > 0 ? PAN_SLACK_PX : 0)
    const limitY = overflowY + (overflowY > 0 ? PAN_SLACK_PX : 0)
    return {
      zoom,
      tx: clamp(next.tx, -limitX, limitX),
      ty: clamp(next.ty, -limitY, limitY),
    }
  }, [])

  /**
   * anchor는 컨테이너 중심 기준 좌표. 그 점 아래에 있던 월드 좌표를
   * 붙잡아 두고 배율만 바꾼다 — 손가락/커서 아래가 밀리지 않는다.
   */
  const zoomFrom = useCallback(
    (nextZoom: number, worldAnchor: Point, screenAnchor: Point) => {
      const nextScale =
        latest.current.baseScale *
        clamp(nextZoom, latest.current.minZoom, MAX_ZOOM)
      setView(
        clampView({
          zoom: nextZoom,
          tx: screenAnchor.x - worldAnchor.x * nextScale,
          ty: screenAnchor.y - worldAnchor.y * nextScale,
        }),
      )
    },
    [clampView],
  )

  const worldPointAt = (from: View, screenPoint: Point): Point => {
    const currentScale = latest.current.baseScale * from.zoom
    return {
      x: (screenPoint.x - from.tx) / currentScale,
      y: (screenPoint.y - from.ty) / currentScale,
    }
  }

  const zoomAround = useCallback(
    (factor: number, screenAnchor: Point) => {
      const from = latest.current.view
      zoomFrom(
        from.zoom * factor,
        worldPointAt(from, screenAnchor),
        screenAnchor,
      )
    },
    [zoomFrom],
  )

  const reset = useCallback(() => setView({ zoom: 1, tx: 0, ty: 0 }), [])

  // ── 제스처 ────────────────────────────────────────────────────────────
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<{
    mode: 'pan' | 'pinch'
    start: Point
    distance: number
    view: View
  } | null>(null)
  /** 팬으로 판정된 제스처는 노드 클릭을 삼킨다(끌다 손을 뗀 자리의 오작동 방지). */
  const panned = useRef(false)

  const toCenterCoords = (event: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2),
    }
  }

  const readGesture = () => {
    const points = [...pointers.current.values()]
    if (points.length >= 2) {
      const [a, b] = points
      return {
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        distance: Math.hypot(a.x - b.x, a.y - b.y),
      }
    }
    return { center: points[0] ?? { x: 0, y: 0 }, distance: 0 }
  }

  const beginGesture = () => {
    const { center, distance } = readGesture()
    gesture.current = {
      mode: pointers.current.size >= 2 ? 'pinch' : 'pan',
      start: center,
      distance,
      view: latest.current.view,
    }
  }

  const onPointerDown = (event: React.PointerEvent) => {
    pointers.current.set(event.pointerId, toCenterCoords(event))
    if (pointers.current.size === 1) panned.current = false
    beginGesture()
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, toCenterCoords(event))
    const active = gesture.current
    if (!active) return
    const { center, distance } = readGesture()

    if (active.mode === 'pinch' && active.distance > 0) {
      panned.current = true
      zoomFrom(
        (active.view.zoom * distance) / active.distance,
        worldPointAt(active.view, active.start),
        center,
      )
      return
    }

    const dx = center.x - active.start.x
    const dy = center.y - active.start.y
    if (!panned.current && Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return
    panned.current = true
    setView(
      clampView({
        zoom: active.view.zoom,
        tx: active.view.tx + dx,
        ty: active.view.ty + dy,
      }),
    )
  }

  const endPointer = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId)
    // 두 손가락 중 하나만 떼면 남은 손가락으로 팬을 이어간다.
    if (pointers.current.size === 0) gesture.current = null
    else beginGesture()
  }

  // 휠/트랙패드 줌. 홈은 스크롤이 없으므로 세로 휠도 줌으로 받는다.
  // passive 기본값이면 preventDefault가 막혀 페이지가 대신 움직인다.
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      zoomAround(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0025)), {
        x: event.clientX - (rect.left + rect.width / 2),
        y: event.clientY - (rect.top + rect.height / 2),
      })
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoomAround])

  return {
    containerRef,
    scale,
    translate: { x: view.tx, y: view.ty },
    /** 사용자가 확대·이동한 상태인지 — 기본 보기로 되돌릴 조건. */
    moved: view.zoom !== 1 || view.tx !== 0 || view.ty !== 0,
    /**
     * 아직 더 축소할 여지가 있는지. '월드가 넘치는지'로 재면 전체 보기를 누른
     * 뒤에도 조건이 참으로 남아 버튼이 같은 자리에 얼어붙는다 — 지금 배율이
     * 하한(minZoom)에 닿았는지로 재야 전체 보기 ↔ 기본 보기로 오간다.
     */
    canZoomOut: view.zoom > minZoom + 0.001,
    zoomOut: () => setView({ zoom: minZoom, tx: 0, ty: 0 }),
    /** 방금 끝난 제스처가 팬이었는지. 노드 클릭 억제에 쓴다. */
    pannedRef: panned,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer,
    },
  }
}
