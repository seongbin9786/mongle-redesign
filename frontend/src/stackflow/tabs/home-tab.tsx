import { useActivityParams, useStepFlow } from '@stackflow/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { chipQuery, homeQuery } from '@/apis/queries'
import { MongleLogo } from '@/components/brand/mongle-logo'
import { PersonCardSheet } from '@/components/home/person-card-sheet'
import { useMainOverlayContainer } from '@/stackflow/activities/main-overlay-container'
import { RelationOrbitMap } from '@/components/home/relation-orbit-map'
import { RelationTagFilter } from '@/components/home/relation-tag-filter'
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
import { personMatchesTag } from '@/lib/relation-list'
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
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)
  // 거리감 표현은 화면 위 토글로 바꾸고 다음 방문에도 유지한다.
  const [depth, setDepth] = useState<OrbitDepthMode>(() => getOrbitDepth())
  useEffect(() => subscribeOrbitDepth(setDepth), [])
  // 홈은 지도 하나만 보여준다 — 리스트로 훑는 일은 사람 탭이 전담한다(mustpass people-directory).

  const mapQuery = useQuery(homeQuery.relationMap())
  const relationTagQuery = useQuery(chipQuery.byType('RELATION_TAG'))

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

  const visibleNodeIds = useMemo(
    () => new Set(graphNodes.map((node) => node.id)),
    [graphNodes],
  )
  const visibleEdges = useMemo(
    () =>
      (mapData?.edges ?? []).filter((edge) =>
        visibleNodeIds.has(edge.personId),
      ),
    [mapData?.edges, visibleNodeIds],
  )

  const isEmpty = mapQuery.isSuccess && allNodes.length === 0
  // 태그 필터는 숨기지 않고 흐린다 — 매칭 0명일 때도 빈 지도 대신 전원 흐림으로
  // 관계 맥락을 보여주고, 초기화 안내만 따로 둔다.
  const matchedCount = useMemo(
    () =>
      graphNodes.filter((node) => personMatchesTag(node, selectedTagId)).length,
    [graphNodes, selectedTagId],
  )

  const selectTag = (tagId: number | null) => {
    setSelectedTagId(tagId)
    void trackFeature(featureEvents.homeRelationTagFiltered, {
      count: tagId == null ? 0 : 1,
    })
  }

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
        <PageTitle>
          함께한 순간, <br /> 몽글몽글 쌓이는 중
        </PageTitle>
      </header>

      {mapQuery.isPending ? (
        <StatusMessage inset="list">관계 지도를 불러오는 중…</StatusMessage>
      ) : mapQuery.isError || !mapData ? (
        <StatusMessage tone="error" inset="list">
          관계 지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </StatusMessage>
      ) : (
        <>
          {relationTagQuery.data &&
          relationTagQuery.data.length > 0 &&
          !isEmpty ? (
            <section className="mt-4 shrink-0">
              <RelationTagFilter
                tags={relationTagQuery.data.map((chip) => ({
                  id: chip.id,
                  label: chip.label,
                  color: chip.color ?? null,
                }))}
                selectedId={selectedTagId}
                onSelect={selectTag}
              />
            </section>
          ) : null}

          {selectedTagId != null && matchedCount === 0 ? (
            <div className="mt-3 flex shrink-0 items-center justify-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 shadow-e1">
              <p className="text-caption text-muted-foreground">
                이 조건에 맞는 사람이 없어요
              </p>
              <button
                type="button"
                onClick={() => selectTag(null)}
                className="text-caption font-semibold text-foreground underline underline-offset-2"
              >
                필터 초기화
              </button>
            </div>
          ) : null}

          <div className="mt-2 min-h-0 flex-1">
            <RelationOrbitMap
              me={mapData.me}
              nodes={graphNodes}
              edges={visibleEdges}
              selectedTagId={selectedTagId}
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
            </RelationOrbitMap>
          </div>
        </>
      )}

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
