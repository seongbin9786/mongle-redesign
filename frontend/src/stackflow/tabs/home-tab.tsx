import { useActivityParams, useStepFlow } from '@stackflow/react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Share2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { homeQuery, zoneQuery } from '@/apis/queries'
import { MongleLogo } from '@/components/brand/mongle-logo'
import { PersonCardSheet } from '@/components/home/person-card-sheet'
import { useMainOverlayContainer } from '@/stackflow/activities/main-overlay-container'
import { RelationOrbitMap } from '@/components/home/relation-orbit-map'
import { UniverseIndicator } from '@/components/home/universe-indicator'
import { UniversePickerSheet } from '@/components/home/universe-picker-sheet'
import { Button } from '@/components/ui/button'
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@/components/ui/empty-state'
import { PageTitle } from '@/components/ui/page-title'
import { StatusMessage } from '@/components/ui/status-message'
import { featureEvents, trackFeature } from '@/lib/analytics'
import {
  getOrbitDepth,
  setOrbitDepth,
  subscribeOrbitDepth,
} from '@/lib/home-orbit-depth'
import type { OrbitDepthMode } from '@/lib/home-orbit-depth'
import {
  getDefaultHomePeriod,
  isPersonInHomePeriod,
  subscribeDefaultHomePeriod,
} from '@/lib/home-period'
import type { HomePeriod } from '@/lib/home-period'
import { buildUniverses, nextUniverseIndex } from '@/lib/home-universes'
import { TabShell } from '@/stackflow/components/tab-shell'
import { useAppFlow } from '@/stackflow/use-app-flow'

export function HomeTab() {
  const { push } = useAppFlow()
  const params = useActivityParams<'Main'>()
  const overlayContainer = useMainOverlayContainer()
  const { pushStep, replaceStep, popStep } = useStepFlow('Main')
  // 설정의 '홈 기본 기간'은 비노출 기준 필터로만 작동한다. 탭 마운트 시 저장값으로
  // 초기화하고, 설정 탭에서 바뀌면 구독으로 즉시 반영한다(홈 탭은 hidden 유지라
  // 리마운트되지 않음). 기간 토글 UI는 궤도 링이 최근성을 대신 보여주면서 제거됐다.
  const [period, setPeriod] = useState<HomePeriod>(() => getDefaultHomePeriod())
  useEffect(() => subscribeDefaultHomePeriod(setPeriod), [])
  // 거리감 표현은 화면 위 토글로 바꾸고 다음 방문에도 유지한다.
  const [depth, setDepth] = useState<OrbitDepthMode>(() => getOrbitDepth())
  useEffect(() => subscribeOrbitDepth(setDepth), [])
  // 홈은 지도 하나만 보여준다 — 리스트로 훑는 일은 사람 탭이 전담한다(mustpass people-directory).

  const mapQuery = useQuery(homeQuery.relationMap())
  const zonesQuery = useQuery(zoneQuery.list())

  const mapData = mapQuery.data
  const allNodes = mapData?.nodes ?? []

  // 기본 기간 기준 필터. 결과가 0명이면 기간 때문에 지도가 비는 것보다 전체를
  // 보여주는 편이 나아 기존(토글 시절) 폴백을 유지한다.
  const periodNodes = useMemo(
    () =>
      allNodes.filter((node) =>
        isPersonInHomePeriod(node.firstMetDate, period),
      ),
    [allNodes, period],
  )
  const graphNodes = periodNodes.length > 0 ? periodNodes : allNodes

  const universes = useMemo(
    () => buildUniverses(graphNodes, zonesQuery.data ?? []),
    [graphNodes, zonesQuery.data],
  )
  // 존을 지우면 우주 수가 줄어드는데, 보고 있던 자리가 사라지면 화면이 빈다.
  const [universeIndex, setUniverseIndex] = useState(0)
  const [universeListOpen, setUniverseListOpen] = useState(false)
  const safeIndex = Math.min(universeIndex, universes.length - 1)
  // 도착 애니메이션의 방향. 첫 렌더(0)에는 애니메이션을 걸지 않는다 —
  // 홈에 들어오자마자 궤도가 옆에서 밀려 들어오면 '넘긴 적 없는데 넘어간' 느낌이 된다.
  const enterDirection = useRef<1 | -1 | 0>(0)
  const universe = universes[safeIndex]

  const goToUniverse = (next: number) => {
    if (next === safeIndex) return
    // 목록에서 골라 와도 도착 방향은 '어느 쪽에 있던 우주인가'로 정한다 —
    // 방향 없이 갈아 끼우면 넘긴 건지 바뀐 건지 구분되지 않는다.
    enterDirection.current = next > safeIndex ? 1 : -1
    setUniverseIndex(next)
    void trackFeature(featureEvents.homeUniverseChanged, {
      index: next,
      zone: universes[next].zoneId != null,
    })
  }

  const moveUniverse = (direction: 1 | -1) =>
    goToUniverse(nextUniverseIndex(safeIndex, direction, universes.length))

  const nodes = universe.nodes
  const visibleNodeIds = useMemo(
    () => new Set(nodes.map((node) => node.id)),
    [nodes],
  )
  const visibleEdges = useMemo(
    () =>
      (mapData?.edges ?? []).filter((edge) =>
        visibleNodeIds.has(edge.personId),
      ),
    [mapData?.edges, visibleNodeIds],
  )

  const isEmpty = mapQuery.isSuccess && allNodes.length === 0
  // 존은 있는데 사람을 아직 안 담은 우주. 인물 0명(콜드스타트)과 다른 안내가 필요하다.
  const isEmptyZone = !isEmpty && universe.kind === 'zone' && nodes.length === 0
  // 마지막 장(만들기). 존이 0개인 사용자도 옆으로 넘기면 여기에 닿아, 스와이프가
  // 있다는 사실과 존이라는 개념을 화면 안에서 처음 만난다.
  const isCreateUniverse = !isEmpty && universe.kind === 'create'
  const hasZone = universes.some((item) => item.kind === 'zone')

  // 시트 열림은 URL step(`/home?personCard=1`)이 유일한 소스다.
  // 열 때만 step을 쌓아 뒤로가기로 닫히게 하고, 열려 있는 동안 다른 사람을
  // 고르면 replace라 히스토리가 늘지 않고 시트도 그대로 있는다.
  const sheetPersonId = params.personCard ? Number(params.personCard) : null

  const openPersonCard = (personId: number) => {
    const next = (prev: typeof params) => ({
      ...prev,
      personCard: String(personId),
    })
    if (sheetPersonId != null) replaceStep(next)
    else pushStep(next)
    void trackFeature(featureEvents.homePersonCardOpened)
  }

  const closePersonCard = () => {
    if (sheetPersonId != null) popStep()
  }

  const sheetPerson =
    graphNodes.find((node) => node.id === sheetPersonId) ??
    allNodes.find((node) => node.id === sheetPersonId) ??
    null

  return (
    // 홈은 스크롤하지 않는다 — 지도가 남는 높이를 채우고, 더 보고 싶으면 줌이다.
    <TabShell layout="fixed">
      <header className="shrink-0">
        <MongleLogo className="mb-4 text-foreground" />
        <div className="flex items-start justify-between gap-3">
          <PageTitle>
            함께한 순간, <br /> 몽글몽글 쌓이는 중
          </PageTitle>
          <button
            type="button"
            onClick={() => push('RelationGraph', {})}
            className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-caption font-medium text-foreground shadow-e1"
          >
            <Share2 className="size-3.5" />
            인물관계도
          </button>
        </div>
      </header>

      {mapQuery.isPending ? (
        <StatusMessage inset="list">관계 지도를 불러오는 중…</StatusMessage>
      ) : mapQuery.isError || !mapData ? (
        <StatusMessage tone="error" inset="list">
          관계 지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </StatusMessage>
      ) : (
        <>
          {isEmpty ? null : (
            <div className="mt-4 shrink-0">
              <UniverseIndicator
                universes={universes}
                index={safeIndex}
                onMove={moveUniverse}
                onOpenList={() => setUniverseListOpen(true)}
              />
            </div>
          )}

          <div className="mt-2 min-h-0 flex-1">
            <RelationOrbitMap
              me={mapData.me}
              nodes={nodes}
              edges={visibleEdges}
              universeId={universe.id}
              enterDirection={enterDirection.current}
              swipe={
                universes.length > 1
                  ? {
                      canSwipe: (direction) =>
                        nextUniverseIndex(
                          safeIndex,
                          direction,
                          universes.length,
                        ) !== safeIndex,
                      onSwipe: moveUniverse,
                    }
                  : undefined
              }
              depth={depth}
              onToggleDepth={() => {
                const next = depth === 'tilt' ? 'focus' : 'tilt'
                setOrbitDepth(next)
                void trackFeature(featureEvents.homeOrbitDepthChanged, {
                  depth: next,
                })
              }}
              onSelectPerson={openPersonCard}
            >
              {isEmpty ? (
                // '나' 노드(가운데)와 겹치지 않게 안내를 아래쪽에 둔다.
                <div className="absolute inset-x-0 bottom-2 z-30 flex flex-col items-center px-8 text-center">
                  <EmptyState>
                    <EmptyStateTitle>아직 기록한 사람이 없어요</EmptyStateTitle>
                    <EmptyStateDescription>
                      첫 사람을 추가해 관계를 남겨보세요. 함께한 따뜻한 순간을
                      기록하면 관계 지도가 조금씩 채워져요.
                    </EmptyStateDescription>
                    <EmptyStateAction>
                      <Button size="cta" onClick={() => push('PersonNew', {})}>
                        ＋ 사람 추가
                      </Button>
                    </EmptyStateAction>
                  </EmptyState>
                </div>
              ) : null}

              {isCreateUniverse ? (
                <div className="absolute inset-x-0 bottom-2 z-30 flex flex-col items-center px-8 text-center">
                  <EmptyState>
                    <EmptyStateTitle>
                      {hasZone
                        ? '새 우주를 만들어 볼까요'
                        : '아직 만든 존이 없어요'}
                    </EmptyStateTitle>
                    <EmptyStateDescription>
                      {hasZone
                        ? '존을 하나 더 만들면 이 자리에 새 우주가 생겨요. 한 사람을 여러 존에 담아도 괜찮아요.'
                        : '최애존·말잇못존처럼 마음의 거리대로 이름을 붙여 보세요. 만든 존은 여기서 좌우로 넘겨 볼 수 있어요.'}
                    </EmptyStateDescription>
                    <EmptyStateAction>
                      <Button
                        size="cta"
                        onClick={() => push('ZoneSettings', {})}
                      >
                        <Plus className="size-4" />존 만들기
                      </Button>
                    </EmptyStateAction>
                  </EmptyState>
                </div>
              ) : null}

              {isEmptyZone ? (
                <div className="absolute inset-x-0 bottom-2 z-30 flex flex-col items-center px-8 text-center">
                  <EmptyState>
                    <EmptyStateTitle>아직 비어 있는 우주예요</EmptyStateTitle>
                    <EmptyStateDescription>
                      설정 &gt; 존 관리에서 이 존에 사람을 담으면 여기 궤도에
                      나타나요.
                    </EmptyStateDescription>
                    <EmptyStateAction>
                      <Button
                        size="cta"
                        variant="outline"
                        onClick={() =>
                          push('ZonePersons', {
                            zoneId: String(universe.zoneId),
                          })
                        }
                      >
                        사람 담으러 가기
                      </Button>
                    </EmptyStateAction>
                  </EmptyState>
                </div>
              ) : null}
            </RelationOrbitMap>
          </div>
        </>
      )}

      <UniversePickerSheet
        universes={universes}
        index={safeIndex}
        open={universeListOpen}
        onOpenChange={setUniverseListOpen}
        onSelect={(next) => {
          setUniverseListOpen(false)
          goToUniverse(next)
        }}
      />

      <PersonCardSheet
        person={sheetPerson}
        container={overlayContainer}
        onOpenChange={(open) => {
          if (!open) closePersonCard()
        }}
        // 다녀와서 뒤로 돌아오면 시트가 그대로 있도록 닫지 않고 그냥 push한다.
        onRecord={(personId) => push('Record', { personId: String(personId) })}
        onProfile={(personId) =>
          push('Person', { personId: String(personId), view: 'profile' })
        }
      />
    </TabShell>
  )
}
