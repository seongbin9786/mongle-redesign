import { Crosshair, Minus, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import { intimacyColor, intimacyStrokeWidth } from '@/lib/intimacy-scale'
import {
  MAP_SCALE_MAX,
  MAP_SCALE_MIN,
  MAP_VIEW_DEFAULT,
  clampScale,
  groupAt,
  zoomAt,
} from '@/lib/relation-graph-map'
import type { MapGroup, MapView } from '@/lib/relation-graph-map'
import { hexToRgba } from '@/lib/relation-tag-colors'
import { cn } from '@/lib/utils'

/**
 * 인물관계도 캔버스 — "누가 누구를 아는가"를 손으로 이어 보는 **지도**.
 *
 * 자유 좌표 위의 점들이 아니라 **영역이 있는 지도**로 그린다. 관계태그로 불러온 무리가
 * 한 구획을 차지하고, 그 구획이 눈에 보여야 "이 사람들이 어떤 무리로 묶여 있는가"가
 * 한눈에 읽힌다. 지도가 화면보다 커질 수 있으므로 빈 바닥을 끌면 지도가 따라 움직인다.
 *
 * **선은 영역과 무관하다.** 구획은 보기 위한 것이지 이을 수 있는 범위가 아니다 —
 * 다른 구역의 누구와도 이어진다(그 교차가 이 화면에서 제일 보고 싶은 것이다).
 *
 * 제스처는 시작점이 가른다: 빈 바닥 = 지도 밀기 / 구역 안쪽 = 구획째 옮기기(사람도 함께) /
 * 아바타 = 인물 옮기기 / 인물의 ＋ 손잡이 = 잇기 / 선 = 그 사이 적기.
 * 두 손가락은 어디서 시작하든 배율이다 — 손가락이 둘이면 그건 늘 확대·축소다.
 */

export type GraphNode = {
  id: number
  name: string
  x: number
  y: number
  /** 속한 영역 key. 어느 구역에도 안 들면 null. */
  groupKey: string | null
}

export type GraphLink = {
  from: number
  to: number
  intimacy: number
  note: string | null
}

const NODE_RADIUS = 26
// 선은 1~5px이라 손끝으로 정확히 짚을 수 없다. 보이는 선과 별개로 넓은 투명 선을 겹쳐 눌리게 한다.
const LINK_HIT_WIDTH = 22

type Drag =
  | { kind: 'move'; id: number; dx: number; dy: number }
  | { kind: 'link'; from: number; x: number; y: number }
  | { kind: 'group'; key: string; dx: number; dy: number }
  | { kind: 'pan'; dx: number; dy: number }

export function RelationGraphCanvas({
  groups,
  nodes,
  links,
  onMoveNode,
  onDropNode,
  onMoveGroup,
  onRemoveGroup,
  onConnect,
  onAddNode,
  onRemoveNode,
  onSelectLink,
}: {
  groups: MapGroup[]
  nodes: GraphNode[]
  links: GraphLink[]
  onMoveNode: (id: number, x: number, y: number) => void
  /** 끌기가 끝난 자리에서 어느 구역에 들어갔는지 확정한다(지도에서는 위치가 곧 소속이다). */
  onDropNode: (id: number, groupKey: string | null) => void
  onMoveGroup: (key: string, x: number, y: number) => void
  onRemoveGroup: (key: string) => void
  onConnect: (from: number, to: number) => void
  onAddNode: () => void
  onRemoveNode: (id: number) => void
  onSelectLink: (link: GraphLink) => void
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<MapView>(MAP_VIEW_DEFAULT)
  // 끄는 중인 제스처. 종류가 넷이어도 포인터는 하나라 상태도 하나로 든다.
  const [drag, setDrag] = useState<Drag | null>(null)
  // 닿아 있는 손가락들. 둘이 되는 순간부터는 무엇을 끌던 중이었든 배율 제스처로 넘어간다.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; scale: number } | null>(null)

  const toScreen = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  // 화면 좌표 → 지도 좌표. 밀린 만큼과 배율은 그릴 때만 얹으므로 여기서 되돌린다.
  const toMap = (event: React.PointerEvent) => {
    const point = toScreen(event)
    return {
      x: (point.x - view.x) / view.scale,
      y: (point.y - view.y) / view.scale,
    }
  }

  const zoomBy = (scale: number, focus: { x: number; y: number }) =>
    setView((current) => zoomAt(current, scale, focus))

  const canvasCenter = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 }
  }

  /**
   * 손가락 장부는 **캡처 단계**에서 적는다. 노드·이름표는 자기 제스처를 지키려고
   * 이벤트를 멈춰 세우는데, 두 번째 손가락이 하필 그 위에 닿으면 캔버스가 영영 모르게 된다.
   */
  const trackDown = (event: React.PointerEvent) => {
    pointers.current.set(event.pointerId, toScreen(event))
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.scale,
      }
      // 끌던 것은 놓는다 — 두 손가락 중 하나로 인물을 끌고 가면 확대하는 내내 사람이 딸려간다.
      setDrag(null)
    }
  }

  const trackMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, toScreen(event))
    if (pointers.current.size !== 2 || !pinch.current) return
    const [a, b] = [...pointers.current.values()]
    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinch.current.distance === 0) return
    zoomBy(pinch.current.scale * (distance / pinch.current.distance), {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    })
  }

  const trackUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const pinching = () => pointers.current.size >= 2

  // 손잡이가 트랙 위 어디쯤인지(0 = 가장 작게, 1 = 가장 크게).
  const scaleRatio =
    (clampScale(view.scale) - MAP_SCALE_MIN) / (MAP_SCALE_MAX - MAP_SCALE_MIN)

  const nodeAt = (x: number, y: number, exceptId: number) =>
    nodes.find(
      (node) =>
        node.id !== exceptId &&
        Math.hypot(node.x - x, node.y - y) <= NODE_RADIUS * 1.6,
    )

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!drag || pinching()) return
    const point = toMap(event)
    if (drag.kind === 'move') {
      onMoveNode(drag.id, point.x - drag.dx, point.y - drag.dy)
      return
    }
    if (drag.kind === 'group') {
      onMoveGroup(drag.key, point.x - drag.dx, point.y - drag.dy)
      return
    }
    if (drag.kind === 'pan') {
      const screen = toScreen(event)
      setView((current) => ({
        ...current,
        x: screen.x - drag.dx,
        y: screen.y - drag.dy,
      }))
      return
    }
    setDrag({ ...drag, x: point.x, y: point.y })
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    const point = toMap(event)
    if (drag?.kind === 'link') {
      const target = nodeAt(point.x, point.y, drag.from)
      if (target) onConnect(drag.from, target.id)
    }
    // 놓은 자리가 곧 소속이다 — 구역 안에 떨어뜨리면 그 무리에, 바깥이면 어디에도 속하지 않는다.
    if (drag?.kind === 'move') {
      const node = nodes.find((item) => item.id === drag.id)
      if (node) onDropNode(node.id, groupAt(groups, node.x, node.y))
    }
    setDrag(null)
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const countByGroup = new Map<string, number>()
  nodes.forEach((node) => {
    if (!node.groupKey) return
    countByGroup.set(node.groupKey, (countByGroup.get(node.groupKey) ?? 0) + 1)
  })

  return (
    <div
      ref={canvasRef}
      onPointerDownCapture={trackDown}
      onPointerMoveCapture={trackMove}
      onPointerUpCapture={trackUp}
      onPointerCancelCapture={trackUp}
      onPointerDown={(event) => {
        // 빈 바닥에서 시작한 끌기만 지도 밀기다(구역·노드·손잡이는 각자 멈춰 세운다).
        const screen = toScreen(event)
        setDrag({
          kind: 'pan',
          dx: screen.x - view.x,
          dy: screen.y - view.y,
        })
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDrag(null)}
      onWheel={(event) => {
        // 마우스 휠도 받아 둔다 — 손가락이 둘일 수 없는 자리에서 가장 흔한 확대 동작이다.
        zoomBy(view.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1), toScreen(event))
      }}
      className={cn(
        'relative h-full w-full touch-none overflow-hidden rounded-2xl border border-border select-none',
        // 격자 바닥 — 지도를 밀 때 '움직이고 있다'를 말해 주는 유일한 단서다.
        '[background-size:28px_28px] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-muted/15',
        drag?.kind === 'pan' ? 'cursor-grabbing' : 'cursor-grab',
      )}
      style={{
        backgroundPosition: `${view.x}px ${view.y}px`,
        backgroundSize: `${28 * view.scale}px ${28 * view.scale}px`,
      }}
    >
      <div
        className="absolute top-0 left-0 h-full w-full origin-top-left"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      >
        {groups.map((group) => {
          const tint = group.color ?? null
          return (
            <div
              key={group.key}
              // 색칠된 안쪽 어디를 잡아도 구획째 옮겨진다 — 지도에서 구역은 '땅'이라,
              // 땅을 잡아 끄는 것이 이름표를 정확히 겨냥하는 것보다 먼저 떠오르는 손짓이다.
              onPointerDown={(event) => {
                event.stopPropagation()
                event.currentTarget.setPointerCapture(event.pointerId)
                const point = toMap(event)
                setDrag({
                  kind: 'group',
                  key: group.key,
                  dx: point.x - group.x,
                  dy: point.y - group.y,
                })
              }}
              className={cn(
                'absolute rounded-3xl border-2 border-dashed',
                drag?.kind === 'group' && drag.key === group.key
                  ? 'cursor-grabbing'
                  : 'cursor-grab',
              )}
              style={{
                left: group.x,
                top: group.y,
                width: group.width,
                height: group.height,
                backgroundColor: tint
                  ? hexToRgba(tint, 0.1)
                  : 'var(--color-muted)',
                borderColor: tint
                  ? hexToRgba(tint, 0.42)
                  : 'var(--color-border)',
              }}
            >
              {/* 이름표가 곧 구획의 손잡이다 — 여기서 시작한 끌기는 구역째 옮긴다. */}
              <div className="absolute -top-3 left-3 flex items-center gap-1">
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    const point = toMap(event)
                    setDrag({
                      kind: 'group',
                      key: group.key,
                      dx: point.x - group.x,
                      dy: point.y - group.y,
                    })
                  }}
                  aria-label={`${group.name} 구역 옮기기`}
                  className="flex max-w-40 cursor-grab items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 shadow-e1 active:cursor-grabbing"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: tint ?? 'var(--color-muted-soft)',
                    }}
                  />
                  <span
                    // 관계태그 이름은 사용자가 지은 말이라 마스킹 대상이다(analytics.ts 마스킹 계약).
                    data-amp-mask
                    className="truncate text-caption font-bold text-foreground"
                  >
                    {group.name}
                  </span>
                  <span className="shrink-0 text-caption font-medium text-muted-foreground">
                    {countByGroup.get(group.key) ?? 0}
                  </span>
                </button>
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onRemoveGroup(group.key)}
                  aria-label={`${group.name} 구역 지우기`}
                  className="grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-e1"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            </div>
          )
        })}

        <svg className="absolute inset-0 h-full w-full overflow-visible">
          {links.map((link) => {
            const from = nodeById.get(link.from)
            const to = nodeById.get(link.to)
            if (!from || !to) return null
            return (
              <g
                key={`${link.from}-${link.to}`}
                role="button"
                tabIndex={0}
                aria-label={`${from.name}과 ${to.name}의 관계 열기`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onSelectLink(link)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectLink(link)
                  }
                }}
                className="cursor-pointer focus-visible:outline-none"
              >
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  strokeWidth={LINK_HIT_WIDTH}
                  stroke="transparent"
                />
                {/* 색은 CSS color-mix 문자열이라 stroke 속성이 아니라 style 로 넘긴다(lib/intimacy-scale). */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  strokeWidth={intimacyStrokeWidth(link.intimacy)}
                  strokeLinecap="round"
                  style={{ stroke: intimacyColor(link.intimacy) }}
                />
              </g>
            )
          })}
          {drag?.kind === 'link' && nodeById.get(drag.from) ? (
            <line
              aria-hidden
              x1={nodeById.get(drag.from)!.x}
              y1={nodeById.get(drag.from)!.y}
              x2={drag.x}
              y2={drag.y}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              className="stroke-foreground"
            />
          ) : null}
        </svg>

        {nodes.map((node) => (
          // 인물은 선보다 위다 — 한 무리를 통째로 불러오면 선이 그물처럼 겹치는데,
          // 그 아래에 얼굴과 이름이 깔리면 지도가 아니라 낙서가 된다.
          <div
            key={node.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: node.x, top: node.y }}
          >
            <div className="relative">
              <button
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  const point = toMap(event)
                  setDrag({
                    kind: 'move',
                    id: node.id,
                    dx: point.x - node.x,
                    dy: point.y - node.y,
                  })
                }}
                className="block cursor-grab rounded-full active:cursor-grabbing"
                aria-label={`${node.name} 옮기기`}
              >
                <MonogramAvatar
                  name={node.name}
                  className="size-13 border-2 border-card shadow-e2"
                />
              </button>

              {/* 연결 손잡이 — 여기서 시작한 드래그만 '잇기'다. */}
              <button
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDrag({ kind: 'link', from: node.id, x: node.x, y: node.y })
                }}
                aria-label={`${node.name}에서 관계 잇기`}
                className={cn(
                  'absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border border-border bg-card text-foreground shadow-e1',
                  drag?.kind === 'link' &&
                    drag.from === node.id &&
                    'bg-foreground text-background',
                )}
              >
                <Plus className="size-3" />
              </button>

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onRemoveNode(node.id)}
                aria-label={`${node.name} 지우기`}
                className="absolute -top-1 -left-1 grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-e1"
              >
                <Trash2 className="size-2.5" />
              </button>

              {/* 이름은 **절대 배치 + pointer-events-none**이다. 흐름에 두면 이름 칸이
                  카드의 아래쪽을 차지해, 오른쪽 아래 연결 손잡이를 덮어 누르는 손을 삼킨다
                  (이으려던 손이 옮기기로 잡히던 원인). 카드 크기를 아바타로 고정해야
                  노드의 중심(x·y)도 아바타의 중심과 같아진다. */}
              {/* 이름 뒤에 바탕을 깐다. 그물 같은 선 위에 맨 글씨를 얹으면 획과 선이 섞여 읽히지 않는다. */}
              <span
                data-amp-mask
                className="pointer-events-none absolute top-full left-1/2 mt-1 block max-w-24 -translate-x-1/2 truncate rounded-full bg-background/85 px-1.5 text-center text-caption font-medium text-foreground"
              >
                {node.name}
              </span>
            </div>
          </div>
        ))}
      </div>

      {nodes.length === 0 && groups.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center">
          <div>
            <p className="text-body font-semibold text-foreground">
              아직 그린 관계가 없어요
            </p>
            <p className="mt-1.5 text-caption font-medium text-muted-foreground">
              ＋로 인물을 올리거나 관계태그를 통째로 불러와 구역을 만들고, 인물
              옆 ＋를 다른 인물로 끌어 연결하세요. 이어진 선을 누르면 친밀도를
              적을 수 있어요.
            </p>
          </div>
        </div>
      ) : null}

      {view.x !== 0 || view.y !== 0 || view.scale !== 1 ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setView(MAP_VIEW_DEFAULT)}
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-caption font-semibold text-foreground shadow-e1"
        >
          <Crosshair className="size-3.5" />
          처음 자리
        </button>
      ) : null}

      {/* 배율 손잡이 — 손가락이 둘일 수 없는 화면(마우스)에서 확대·축소를 **끌어서** 한다.
          버튼 두 개로 두면 원하는 배율까지 여러 번 눌러야 하고, 얼마나 키웠는지도 알 수 없다. */}
      <div
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute top-3 left-3 flex flex-col items-center gap-1 rounded-full border border-border bg-card/90 px-1.5 py-2 shadow-e1"
      >
        <Plus className="size-3 text-muted-foreground" />
        <div
          role="slider"
          tabIndex={0}
          aria-label="지도 배율"
          aria-valuemin={Math.round(MAP_SCALE_MIN * 100)}
          aria-valuemax={Math.round(MAP_SCALE_MAX * 100)}
          aria-valuenow={Math.round(view.scale * 100)}
          aria-valuetext={`${Math.round(view.scale * 100)}%`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (event.buttons === 0) return
            const track = event.currentTarget.getBoundingClientRect()
            // 위로 끌수록 크게. 트랙 위쪽이 최대 배율이다.
            const ratio = 1 - (event.clientY - track.top) / track.height
            zoomBy(
              MAP_SCALE_MIN + ratio * (MAP_SCALE_MAX - MAP_SCALE_MIN),
              canvasCenter(),
            )
          }}
          onKeyDown={(event) => {
            const step =
              event.key === 'ArrowUp'
                ? 0.1
                : event.key === 'ArrowDown'
                  ? -0.1
                  : 0
            if (step === 0) return
            event.preventDefault()
            zoomBy(view.scale + step, canvasCenter())
          }}
          className="relative h-24 w-6 cursor-ns-resize touch-none py-1"
        >
          <span className="absolute top-1 bottom-1 left-1/2 w-1 -translate-x-1/2 rounded-full bg-muted" />
          <span
            className="absolute left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground shadow-e1"
            style={{ top: `${4 + (1 - scaleRatio) * 88}px` }}
          />
        </div>
        <Minus className="size-3 text-muted-foreground" />
        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
          {Math.round(view.scale * 100)}
        </span>
      </div>

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onAddNode}
        className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-label font-semibold text-background shadow-e2"
      >
        <Plus className="size-4" />
        인물 올리기
      </button>
    </div>
  )
}
