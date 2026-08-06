import { useMemo } from 'react'
import type {
  MeNode,
  PersonNode,
  RelationEdge,
} from '@/apis/generated/mongle-api.schemas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { defaultPersonImageUrl } from '@/lib/default-person-image'
import { formatPersonName, monogram } from '@/lib/format'
import { optimizedImageUrl } from '@/lib/image-url'
import { hexToRgba, primaryTagColor } from '@/lib/relation-tag-colors'
import {
  ORBIT_CENTER,
  ORBIT_RINGS,
  ORBIT_VIEWBOX,
  layoutOrbitNodes,
  orbitArcPath,
} from '@/lib/relation-orbit-layout'
import { cn } from '@/lib/utils'

// 홈의 주연 — '나' 중심 동심원 궤도. 위치가 최근성 정보라 줌·팬·범례가 없다.
// 시안 A(2026-07-29-ux-directions/A-relation-orbit.html)의 구조를 제품화했다:
// 링 4개 + 멀어진 관계 점선 호 + 노드 bob. SVG는 선(링·호·라벨)만 그리고
// 노드는 사진·접근성·터치 면적을 위해 HTML 버튼 오버레이로 그린다.
export function RelationOrbitMap({
  me,
  nodes,
  edges,
  selectedTagIds,
  onSelectPerson,
  children,
}: {
  me: MeNode
  nodes: PersonNode[]
  edges: RelationEdge[]
  /** 선택된 관계태그 칩 id. 하나라도 고르면 안 맞는 노드를 숨기지 않고 흐린다. */
  selectedTagIds: number[]
  onSelectPerson: (personId: number) => void
  /** 인물 0명일 때 궤도 한가운데에 렌더할 오버레이(빈 상태 안내). */
  children?: React.ReactNode
}) {
  const layouts = useMemo(
    () =>
      layoutOrbitNodes(
        nodes.map((node) => ({
          id: node.id,
          daysSinceLastMeet: node.intimacy.daysSinceLastMeet,
        })),
      ),
    [nodes],
  )
  const layoutByPersonId = useMemo(
    () => new Map(layouts.map((layout) => [layout.personId, layout])),
    [layouts],
  )
  const distantPersonIds = useMemo(
    () => new Set(edges.filter((edge) => edge.distant).map((e) => e.personId)),
    [edges],
  )
  const hasTagFilter = selectedTagIds.length > 0
  const meImageSrc = optimizedImageUrl(me.profileImageUrl, 128)

  return (
    <div
      className="relative mx-auto w-full max-w-[430px]"
      style={{
        aspectRatio: `${ORBIT_VIEWBOX.width} / ${ORBIT_VIEWBOX.height}`,
      }}
    >
      <svg
        viewBox={`0 0 ${ORBIT_VIEWBOX.width} ${ORBIT_VIEWBOX.height}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {ORBIT_RINGS.map((ring, index) => (
          <circle
            key={ring.label}
            cx={ORBIT_CENTER.x}
            cy={ORBIT_CENTER.y}
            r={ring.radius}
            fill="none"
            strokeWidth={1}
            className="orbit-ring stroke-border"
            style={{ animationDelay: `${index * 55}ms` }}
          />
        ))}
        {/* 멀어진 관계 — 사라지지 않고 제 자리에서 쉬도록 노드 양옆에 점선 호를 둔다. */}
        {layouts
          .filter((layout) => distantPersonIds.has(layout.personId))
          .map((layout) => (
            <path
              key={`quiet-${layout.personId}`}
              d={orbitArcPath(
                ORBIT_RINGS[layout.ringIndex].radius,
                layout.angleDeg - 16,
                layout.angleDeg + 16,
              )}
              fill="none"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeDasharray="2.5 5.5"
              className="stroke-muted-soft/70"
            />
          ))}
      </svg>

      {/* 링 라벨은 12시 방향. 노드가 지나가도 읽히도록 배경을 깐다. */}
      {ORBIT_RINGS.map((ring) => (
        <span
          key={ring.label}
          className="absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium tracking-[0.05em] text-muted-soft backdrop-blur-[2px]"
          style={{
            left: '50%',
            top: `${((ORBIT_CENTER.y - ring.radius - 8) / ORBIT_VIEWBOX.height) * 100}%`,
          }}
        >
          {ring.label}
        </span>
      ))}

      {/* 멀어진 관계가 있을 때만 — 흐림의 의미를 한 줄로 환기한다(시안 A 카피). */}
      {distantPersonIds.size > 0 ? (
        <p className="absolute top-[2%] left-1/2 z-10 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-soft">
          흐려진 관계는 지금 제 자리에서 조용히 쉬고 있어요
        </p>
      ) : null}

      {/* '나' 노드 — 시안 A처럼 표면 원 하나를 받치고, 사진이 없으면 먹색 원 + '나'. */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{
          left: '50%',
          top: `${(ORBIT_CENTER.y / ORBIT_VIEWBOX.height) * 100}%`,
        }}
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
        const layout = layoutByPersonId.get(node.id)
        if (!layout) return null
        const distant = distantPersonIds.has(node.id)
        const dimmed =
          hasTagFilter &&
          !node.relationTags.some((tag) => selectedTagIds.includes(tag.id))
        const displayName = formatPersonName(node)
        // 그룹 컬러링 — 태그 색이 곧 범례라 노드 테두리를 첫 관계태그 색으로
        // 칠한다(시안 A의 그룹 표현). 즐겨찾기는 PRD 계약인 잉크 테두리 + 별이 우선.
        const groupColor = node.favorite
          ? null
          : primaryTagColor(node.relationTags)

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelectPerson(node.id)}
            className={cn(
              'absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-ring',
              distant && 'opacity-40',
              dimmed && 'opacity-[0.16]',
              distant && dimmed && 'opacity-[0.1]',
            )}
            style={{
              left: `${layout.xPercent}%`,
              top: `${layout.yPercent}%`,
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
                  'mt-1 max-w-[76px] truncate text-[11px] leading-none font-medium',
                  distant ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {displayName}
              </span>
            </span>
          </button>
        )
      })}

      {children}
    </div>
  )
}
