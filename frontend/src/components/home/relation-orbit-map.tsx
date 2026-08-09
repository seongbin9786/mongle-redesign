import { Maximize2 } from 'lucide-react'
import { useMemo } from 'react'
import type {
  MeNode,
  PersonNode,
  RelationEdge,
} from '@/apis/generated/mongle-api.schemas'
import { personNodeProps } from '@/components/home/person-node-marker'
import { useOrbitViewport } from '@/components/home/use-orbit-viewport'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { defaultPersonImageUrl } from '@/lib/default-person-image'
import { formatPersonName, monogram } from '@/lib/format'
import { optimizedImageUrl } from '@/lib/image-url'
import { hexToRgba, primaryTagColor } from '@/lib/relation-tag-colors'
import { layoutOrbit, orbitArcPath } from '@/lib/relation-orbit-layout'
import { cn } from '@/lib/utils'

// 홈의 주연 — '나' 중심 동심원 궤도. 위치가 최근성 정보라 범례가 없다.
// SVG는 선(링·호)만 그리고 노드는 사진·접근성·터치 면적을 위해 HTML 버튼으로 그린다.
//
// 월드(링·노드)는 하나의 변환 레이어 안에 있고, 그 레이어가 컨테이너에 맞게
// 축소되거나 사용자가 확대한 만큼 커진다 — 홈에 스크롤이 없는 대신 줌으로 본다.

// 바깥 링일수록 옅게 — 다만 완전히 지우지는 않는다(시간의 눈금이라 늘 보여야 한다).
// 선과 라벨은 옅어지는 속도가 달라야 한다. 선이 읽힐 만큼 진하면 라벨이 시끄럽고,
// 라벨이 읽힐 만큼 진하면 선이 지도를 가른다.
const RING_LINE_FADE = { near: 0.5, far: 0.12 } as const
const RING_LABEL_FADE = { near: 0.9, far: 0.35 } as const

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
  onSelectPerson,
  children,
}: {
  me: MeNode
  nodes: PersonNode[]
  edges: RelationEdge[]
  /** 선택된 관계태그 칩 id. 고르면 안 맞는 노드를 숨기지 않고 흐린다. */
  selectedTagId: number | null
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
  const meImageSrc = optimizedImageUrl(me.profileImageUrl, 128)

  const viewport = useOrbitViewport(layout.worldRadius)
  const { worldRadius, radii, rings } = layout
  const worldSize = worldRadius * 2
  /** 월드 좌표(중심 0,0) → 변환 레이어 안의 % 위치. */
  const percent = (value: number) => ((value + worldRadius) / worldSize) * 100
  // 글자만은 지도와 함께 축소하지 않는다 — 전체를 담는 배율에서 이름이 6px가
  // 되면 읽을 수 없다. 배율의 역수를 곱해 화면상 크기를 항상 같게 유지한다.
  const screenPx = (px: number) => px / viewport.scale

  return (
    <div
      ref={viewport.containerRef}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      {...viewport.handlers}
    >
      <div
        className="absolute top-1/2 left-1/2 will-change-transform"
        style={{
          width: worldSize,
          height: worldSize,
          transform: `translate(-50%, -50%) translate(${viewport.translate.x}px, ${viewport.translate.y}px) scale(${viewport.scale})`,
        }}
      >
        <svg
          viewBox={`${-worldRadius} ${-worldRadius} ${worldSize} ${worldSize}`}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {/* 인원이 0명인 링도 지운 적 없다 — 궤도는 시간의 눈금이라 늘 있어야 한다. */}
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
          {/* 멀어진 관계 — 사라지지 않고 제 자리에서 쉬도록 노드 양옆에 점선 호를 둔다. */}
          {layout.nodes
            .filter((node) => distantPersonIds.has(node.personId))
            .map((node) => (
              <path
                key={`quiet-${node.personId}`}
                d={orbitArcPath(
                  node.radius,
                  node.angleDeg - 16,
                  node.angleDeg + 16,
                )}
                fill="none"
                strokeWidth={screenPx(1.4)}
                strokeLinecap="round"
                strokeDasharray={`${screenPx(2.5)} ${screenPx(5.5)}`}
                className="stroke-muted-soft/70"
              />
            ))}
        </svg>

        {/* 링 라벨은 12시 방향. 노드가 지나가도 읽히도록 배경을 깐다. */}
        {rings.map((ring, index) => (
          <span
            key={ring.label}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/85 font-medium tracking-[0.02em] text-muted-soft"
            style={{
              left: '50%',
              // 링 선 바로 바깥에 걸쳐 둔다 — 선 위에 얹으면 노드와 자리를 다툰다.
              top: `${percent(-radii[index] - screenPx(9))}%`,
              opacity: ringFade(RING_LABEL_FADE, index, radii.length),
              fontSize: screenPx(10),
              lineHeight: 1.3,
              padding: `0 ${screenPx(5)}px`,
            }}
          >
            {ring.label}
          </span>
        ))}

        {/* '나' 노드 — 표면 원 하나를 받치고, 사진이 없으면 먹색 원 + '나'. */}
        <div
          className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
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
                'absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-ring',
                distant && 'opacity-40',
                dimmed && 'opacity-[0.16]',
                distant && dimmed && 'opacity-[0.1]',
              )}
              style={{
                left: `${percent(placed.x)}%`,
                top: `${percent(placed.y)}%`,
              }}
              aria-label={`${displayName} 상세`}
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
                      'size-9 border-2 bg-card shadow-e1 transition-transform duration-150 active:scale-90',
                      node.favorite && 'border-foreground',
                      !node.favorite && !groupColor && 'border-border',
                    )}
                    style={groupColor ? { borderColor: groupColor } : undefined}
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
                              backgroundColor: hexToRgba(groupColor, 0.13),
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
                <span
                  data-amp-mask
                  className={cn(
                    'truncate font-medium',
                    distant ? 'text-muted-foreground' : 'text-foreground',
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
              </span>
            </button>
          )
        })}
      </div>

      {/* 확대·이동해서 전체가 안 보일 때만 돌아갈 길을 열어 둔다. */}
      {viewport.adjusted ? (
        <button
          type="button"
          onClick={viewport.reset}
          className="absolute top-2 right-2 z-40 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-caption font-medium text-foreground shadow-e1 backdrop-blur-[2px]"
        >
          <Maximize2 className="size-3.5" />
          전체 보기
        </button>
      ) : null}

      {children}
    </div>
  )
}
