import { Aperture, Layers, Maximize2 } from 'lucide-react'
import { useMemo } from 'react'
import type {
  MeNode,
  PersonNode,
  RelationEdge,
} from '@/apis/generated/mongle-api.schemas'
import { personNodeProps } from '@/components/home/person-node-marker'
import {
  ORBIT_TILT_DEG,
  orbitDepthStyle,
  orbitVerticalSquash,
} from '@/components/home/orbit-depth'
import { useOrbitViewport } from '@/components/home/use-orbit-viewport'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { defaultPersonImageUrl } from '@/lib/default-person-image'
import { formatPersonName, monogram } from '@/lib/format'
import type { OrbitDepthMode } from '@/lib/home-orbit-depth'
import { optimizedImageUrl } from '@/lib/image-url'
import { hexToRgba, primaryTagColor } from '@/lib/relation-tag-colors'
import { layoutOrbit, nearestNeighbourGaps } from '@/lib/relation-orbit-layout'
import { cn } from '@/lib/utils'

// 홈의 주연 — '나' 중심 궤도. 위치가 최근성 정보라 범례가 없다.
// SVG는 선(눈금·호)만 그리고 노드는 사진·접근성·터치 면적을 위해 HTML 버튼으로 그린다.
//
// 월드(눈금·노드)는 하나의 변환 레이어 안에 있고, 그 레이어가 컨테이너에 맞게
// 축소되거나 사용자가 확대한 만큼 커진다 — 홈에 스크롤이 없는 대신 줌으로 본다.

// 바깥 눈금일수록 옅게 — 다만 완전히 지우지는 않는다(시간의 눈금이라 늘 보여야 한다).
// 선과 라벨은 옅어지는 속도가 달라야 한다. 선이 읽힐 만큼 진하면 라벨이 시끄럽고,
// 라벨이 읽힐 만큼 진하면 선이 지도를 가른다.
const RING_LINE_FADE = { near: 0.5, far: 0.12 } as const
const RING_LABEL_FADE = { near: 0.9, far: 0.35 } as const

// 붐빔 기준 — '가장 가까운 이웃까지의 화면상 거리'가 이만큼은 돼야 이름을 쓴다.
const NAME_ROOM_PX = 56
const NODE_ROOM_PX = 50
const MIN_CROWD_SCALE = 0.58

function ringFade(
  range: { near: number; far: number },
  index: number,
  count: number,
) {
  if (count <= 1) return range.near
  return range.near - (range.near - range.far) * (index / (count - 1))
}

export function RelationOrbitMap({
  me,
  nodes,
  edges,
  selectedTagId,
  depth,
  onToggleDepth,
  onSelectPerson,
  children,
}: {
  me: MeNode
  nodes: PersonNode[]
  edges: RelationEdge[]
  /** 선택된 관계태그 칩 id. 고르면 안 맞는 노드를 숨기지 않고 흐린다. */
  selectedTagId: number | null
  depth: OrbitDepthMode
  onToggleDepth: () => void
  onSelectPerson: (personId: number) => void
  /** 인물 0명일 때 궤도 위에 얹을 오버레이(빈 상태 안내). */
  children?: React.ReactNode
}) {
  const layout = useMemo(
    () =>
      layoutOrbit(
        nodes.map((node) => ({
          id: node.id,
          daysSinceLastMeet: node.intimacy.daysSinceLastMeet,
        })),
      ),
    [nodes],
  )
  const layoutByPersonId = useMemo(
    () => new Map(layout.nodes.map((node) => [node.personId, node])),
    [layout],
  )
  const distantPersonIds = useMemo(
    () => new Set(edges.filter((edge) => edge.distant).map((e) => e.personId)),
    [edges],
  )
  const tilted = depth === 'tilt'
  // 붐빔은 '눈에 보이는 거리'로 재야 한다. 판을 눕히면 세로가 눌리므로
  // 눌린 뒤의 거리로 이웃을 잰다 — 그래서 지평선 쪽 이름이 먼저 접힌다.
  const neighbourGaps = useMemo(
    () => nearestNeighbourGaps(layout.nodes, orbitVerticalSquash(depth)),
    [layout.nodes, depth],
  )
  const meImageSrc = optimizedImageUrl(me.profileImageUrl, 128)

  const viewport = useOrbitViewport(layout.worldRadius, layout.focusRadius)
  const { worldRadius, radii, rings, focusRadius } = layout
  const worldSize = worldRadius * 2
  /** 월드 좌표(중심 0,0) → 변환 레이어 안의 % 위치. */
  const percent = (value: number) => ((value + worldRadius) / worldSize) * 100
  // 글자와 선 굵기는 지도와 함께 축소하지 않는다 — 전체를 담는 배율에서 이름이
  // 6px가 되면 읽을 수 없고 1px 선은 아예 사라진다.
  const screenPx = (px: number) => px / viewport.scale
  // 각도로 들고 있어야 전환이 애니메이션된다(켜짐/꺼짐이 아니라 46°↔0°).
  // 그래서 perspective와 preserve-3d는 모드와 무관하게 항상 켜 둔다.
  const tiltDeg = tilted ? ORBIT_TILT_DEG : 0
  const upright = `rotateX(${-tiltDeg}deg)`

  return (
    <div
      ref={viewport.containerRef}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      style={{ perspective: '1100px' }}
      {...viewport.handlers}
    >
      {/* 팬·줌 레이어와 기울임 레이어를 나눈다 — 한 요소에 두면 기울임에 건
          transition이 드래그·핀치까지 늘어지게 만든다. */}
      <div
        className="absolute top-1/2 left-1/2 will-change-transform"
        style={{
          width: worldSize,
          height: worldSize,
          transform: `translate(-50%, -50%) translate(${viewport.translate.x}px, ${viewport.translate.y}px) scale(${viewport.scale})`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="orbit-tilt absolute inset-0"
          style={{
            transform: `rotateX(${tiltDeg}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          <svg
            viewBox={`${-worldRadius} ${-worldRadius} ${worldSize} ${worldSize}`}
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {/* 인원이 0명인 눈금도 지우지 않는다 — 궤도는 시간의 눈금이라 늘 있어야 한다. */}
            {radii.map((radius, index) => (
              <circle
                key={rings[index].label}
                cx={0}
                cy={0}
                r={radius}
                fill="none"
                // 선 굵기도 배율을 되돌린다 — 축소되면 1px 미만이 되어 사라진다.
                strokeWidth={screenPx(1)}
                strokeOpacity={ringFade(RING_LINE_FADE, index, radii.length)}
                className="orbit-ring stroke-muted-soft"
                style={{ animationDelay: `${index * 45}ms` }}
              />
            ))}
          </svg>

          {/* 눈금 라벨은 12시 방향. 노드가 지나가도 읽히도록 배경을 깐다. */}
          {rings.map((ring, index) => (
            <span
              key={ring.label}
              className="orbit-tilt absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/85 font-medium tracking-[0.02em] text-muted-soft"
              style={{
                left: '50%',
                // 눈금 선 바로 바깥에 걸쳐 둔다 — 선 위에 얹으면 노드와 자리를 다툰다.
                top: `${percent(-radii[index] - screenPx(9))}%`,
                opacity: ringFade(RING_LABEL_FADE, index, radii.length),
                fontSize: screenPx(10),
                lineHeight: 1.3,
                padding: `0 ${screenPx(5)}px`,
                // 가운데 정렬은 Tailwind 클래스가 `translate` 속성으로 이미 걸었다.
                // 여기서 또 쓰면 두 번 적용돼 반칸씩 밀린다(Tailwind v4).
                transform: upright,
              }}
            >
              {ring.label}
            </span>
          ))}

          {/* '나' 노드 — 표면 원 하나를 받치고, 사진이 없으면 먹색 원 + '나'. */}
          <div
            className="orbit-tilt absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: upright }}
            aria-label={me.name}
          >
            <div className="grid size-16 place-items-center rounded-full bg-secondary ring-1 ring-border">
              {meImageSrc ? (
                <Avatar className="size-[46px]">
                  <AvatarImage src={meImageSrc} alt={`${me.name} 프로필`} />
                  <AvatarFallback>{monogram(me.name)}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="grid size-[42px] place-items-center rounded-full bg-foreground text-[13px] font-semibold text-background">
                  나
                </div>
              )}
            </div>
          </div>

          {nodes.map((node, index) => {
            const placed = layoutByPersonId.get(node.id)
            if (!placed) return null
            const distant = distantPersonIds.has(node.id)
            const dimmed =
              selectedTagId != null &&
              !node.relationTags.some((tag) => tag.id === selectedTagId)
            const displayName = formatPersonName(node)
            // 그룹 컬러링 — 태그 색이 곧 범례라 노드 테두리를 첫 관계태그 색으로
            // 칠한다. 즐겨찾기는 PRD 계약인 잉크 테두리 + 별이 우선.
            const groupColor = node.favorite
              ? null
              : primaryTagColor(node.relationTags)
            const cue = orbitDepthStyle(depth, placed.radius / focusRadius)
            // 이웃이 가까울수록 물러선다. 사람이 많을 때 얼굴이 서로 파고들고
            // 이름이 얼룩이 되는 게 화면을 시끄럽게 만드는 진짜 원인이다.
            const room =
              (neighbourGaps.get(node.id) ?? Number.POSITIVE_INFINITY) *
              viewport.scale
            const crowdScale = Math.min(
              1,
              Math.max(MIN_CROWD_SCALE, room / NODE_ROOM_PX),
            )
            // 흐림(멀어진 관계 · 필터 미매칭)은 버튼이 아니라 거리감 레이어에 건다.
            // opacity < 1도 filter처럼 3D를 평면화해서, 버튼에 걸면 자식의 세우기
            // 회전이 '세우기'가 아니라 세로 찌그러짐으로 렌더된다.
            const dimFactor = dimmed
              ? distant
                ? 0.1
                : 0.16
              : distant
                ? 0.4
                : 1

            return (
              <button
                key={node.id}
                type="button"
                {...personNodeProps}
                onClick={() => {
                  // 지도를 끌고 온 손가락이 노드 위에서 멈춰도 시트가 열리면 안 된다.
                  if (viewport.pannedRef.current) return
                  onSelectPerson(node.id)
                }}
                className={cn(
                  'absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  // 눕힌 판에서 사람을 세우려면 역회전이 '진짜 3D 회전'으로
                  // 남아야 한다. 버튼이 3D를 평면으로 눌러버리면 역회전은
                  // 세우기가 아니라 세로 찌그러짐으로 렌더된다. 그래서 이 버튼에는
                  // 평면화를 부르는 속성(opacity < 1, filter 등)을 걸지 않는다.
                  '[transform-style:preserve-3d]',
                )}
                style={{
                  left: `${percent(placed.x)}%`,
                  top: `${percent(placed.y)}%`,
                }}
                aria-label={`${displayName} 상세`}
              >
                {/* 세우기 · 거리감 · 부유를 각각 다른 레이어에 둔다. 셋 다
                  transform을 쓰고 filter는 3D를 평면화해서, 한 요소에 겹치면
                  서로를 죽인다. */}
                <span
                  className="orbit-tilt block [transform-style:preserve-3d]"
                  style={{ transform: upright }}
                >
                  <span
                    className="block transition-[opacity,filter] duration-300"
                    style={{
                      opacity: cue.opacity * dimFactor,
                      filter: cue.filter,
                      transform: `scale(${(cue.scale * crowdScale).toFixed(3)})`,
                    }}
                  >
                    <span
                      className="orbit-bob flex flex-col items-center"
                      style={{
                        animationDuration: `${5.6 + (index % 5) * 0.8}s`,
                        animationDelay: `${-(index * 1.1) % 6}s`,
                      }}
                    >
                      <span className="relative">
                        <Avatar
                          className={cn(
                            'size-10 border-2 bg-card shadow-e1 transition-transform duration-150 active:scale-90',
                            node.favorite && 'border-foreground',
                            !node.favorite && !groupColor && 'border-border',
                          )}
                          style={
                            groupColor ? { borderColor: groupColor } : undefined
                          }
                        >
                          <AvatarImage
                            src={
                              optimizedImageUrl(node.profileImageUrl, 128) ??
                              defaultPersonImageUrl({
                                id: node.id,
                                name: node.name,
                                gender: node.avatarGender ?? null,
                              })
                            }
                            alt={displayName}
                          />
                          <AvatarFallback
                            style={
                              groupColor
                                ? {
                                    backgroundColor: hexToRgba(
                                      groupColor,
                                      0.13,
                                    ),
                                    color: groupColor,
                                  }
                                : undefined
                            }
                          >
                            {monogram(node.name)}
                          </AvatarFallback>
                        </Avatar>
                        {node.favorite ? (
                          <span className="absolute -top-1.5 -right-1 text-[10px] leading-none text-amber-500">
                            ★
                          </span>
                        ) : null}
                      </span>
                      {/* 이름이 서로 닿을 만큼 붐비면 얼굴만 남긴다. 겹친 이름은
                        정보가 아니라 얼룩이다. 확대하면 자리가 생겨 다시 나온다. */}
                      {room >= NAME_ROOM_PX ? (
                        <span
                          data-amp-mask
                          className={cn(
                            'truncate font-medium',
                            distant
                              ? 'text-muted-foreground'
                              : 'text-foreground',
                          )}
                          style={{
                            marginTop: screenPx(3),
                            maxWidth: screenPx(76),
                            fontSize: screenPx(10),
                            lineHeight: 1,
                          }}
                        >
                          {displayName}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleDepth}
        className="absolute top-2 left-2 z-40 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-caption font-medium text-foreground shadow-e1 backdrop-blur-[2px]"
        aria-label={tilted ? '초점으로 보기' : '기울여서 보기'}
      >
        {tilted ? (
          <Aperture className="size-3.5" />
        ) : (
          <Layers className="size-3.5" />
        )}
        {tilted ? '초점' : '기울임'}
      </button>

      {/* 기본 배율은 사람이 읽히는 크기를 먼저 지키므로 바깥 궤도가 화면을
          넘칠 수 있다. 넘친 만큼 돌아갈 길을 항상 열어 둔다. */}
      {viewport.canZoomOut || viewport.moved ? (
        <button
          type="button"
          onClick={viewport.canZoomOut ? viewport.zoomOut : viewport.reset}
          className="absolute top-2 right-2 z-40 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-caption font-medium text-foreground shadow-e1 backdrop-blur-[2px]"
        >
          <Maximize2 className="size-3.5" />
          {viewport.canZoomOut ? '전체 보기' : '기본 보기'}
        </button>
      ) : null}

      {children}
    </div>
  )
}
