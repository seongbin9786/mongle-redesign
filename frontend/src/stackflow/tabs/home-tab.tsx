import { useActivityParams, useStepFlow } from '@stackflow/react'
import { useQuery } from '@tanstack/react-query'
import { Clock3, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { chipQuery, homeQuery } from '@/apis/queries'
import { PersonCardSheet } from '@/components/home/person-card-sheet'
import { useMainOverlayContainer } from '@/stackflow/activities/main-overlay-container'
import { RelationOrbitMap } from '@/components/home/relation-orbit-map'
import { RelationTagFilter } from '@/components/home/relation-tag-filter'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@/components/ui/empty-state'
import { StatusMessage } from '@/components/ui/status-message'
import { featureEvents, trackFeature } from '@/lib/analytics'
import {
  getDefaultHomePeriod,
  isPersonInHomePeriod,
  subscribeDefaultHomePeriod,
} from '@/lib/home-period'
import type { HomePeriod } from '@/lib/home-period'
import { personMatchesTags } from '@/lib/relation-list'
import { cn } from '@/lib/utils'
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
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [throwbackDismissed, setThrowbackDismissed] = useState(false)
  const [throwbackExiting, setThrowbackExiting] = useState(false)
  // 홈은 지도 하나만 보여준다 — 리스트로 훑는 일은 사람 탭이 전담한다(mustpass people-directory).

  const mapQuery = useQuery(homeQuery.relationMap())
  const relationTagQuery = useQuery(chipQuery.byType('RELATION_TAG'))
  const throwbackQuery = useQuery(homeQuery.throwback())

  const throwback = throwbackQuery.data
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
      graphNodes.filter((node) => personMatchesTags(node, selectedTagIds))
        .length,
    [graphNodes, selectedTagIds],
  )

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) => {
      const next = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
      void trackFeature(featureEvents.homeRelationTagFiltered, {
        count: next.length,
      })
      return next
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
  const sheetDistant = sheetPerson
    ? ((mapData?.edges ?? []).find((edge) => edge.personId === sheetPerson.id)
        ?.distant ?? sheetPerson.intimacy.status === 'DISTANT')
    : false

  return (
    <TabShell>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">
            관계 지도
          </h1>
          <p className="mt-1 text-caption text-muted-foreground">
            {isEmpty ? (
              '기록을 남길수록 지도가 채워져요'
            ) : (
              <>
                <span className="font-semibold text-foreground">
                  {graphNodes.length}명
                </span>{' '}
                · 최근 만남 기준
              </>
            )}
          </p>
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
          {relationTagQuery.data &&
          relationTagQuery.data.length > 0 &&
          !isEmpty ? (
            <section className="mb-3">
              <RelationTagFilter
                tags={relationTagQuery.data.map((chip) => ({
                  id: chip.id,
                  label: chip.label,
                  color: chip.color ?? null,
                }))}
                selectedIds={selectedTagIds}
                onToggle={toggleTag}
                onClear={() => setSelectedTagIds([])}
              />
            </section>
          ) : null}

          {selectedTagIds.length > 0 && matchedCount === 0 ? (
            <div className="mb-3 flex items-center justify-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 shadow-e1">
              <p className="text-caption text-muted-foreground">
                이 조건에 맞는 사람이 없어요
              </p>
              <button
                type="button"
                onClick={() => setSelectedTagIds([])}
                className="text-caption font-semibold text-foreground underline underline-offset-2"
              >
                필터 초기화
              </button>
            </div>
          ) : null}

          <RelationOrbitMap
            me={mapData.me}
            nodes={graphNodes}
            edges={visibleEdges}
            selectedTagIds={selectedTagIds}
            onSelectPerson={openPersonCard}
          >
            {isEmpty ? (
              // '나' 노드(세로 약 51%)와 겹치지 않게 안내를 중심 아래에 둔다.
              <div className="absolute inset-0 z-30 flex flex-col items-center px-8 pt-[82%] text-center">
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
        </>
      )}

      <PersonCardSheet
        person={sheetPerson}
        container={overlayContainer}
        distant={sheetDistant}
        onOpenChange={(open) => {
          if (!open) closePersonCard()
        }}
        // 다녀와서 뒤로 돌아오면 시트가 그대로 있도록 닫지 않고 그냥 push한다.
        onRecord={(personId) => push('Record', { personId: String(personId) })}
        onProfile={(personId) =>
          push('Person', { personId: String(personId), view: 'profile' })
        }
      />

      {throwback && !throwbackDismissed ? (
        <div className="pointer-events-none absolute right-4 bottom-[6.25rem] left-4 z-40">
          <div
            className={cn(
              'pointer-events-auto mx-auto w-full max-w-md',
              throwbackExiting
                ? 'animate-out fade-out slide-out-to-bottom-6 duration-300 ease-out fill-mode-forwards'
                : 'animate-in fade-in slide-in-from-bottom-6 duration-300 ease-out',
            )}
            onAnimationEnd={() => {
              if (throwbackExiting) setThrowbackDismissed(true)
            }}
          >
            <Card className="relative flex min-h-[82px] flex-row items-center gap-3 rounded-lg border border-border bg-card p-3.5 pr-10 text-card-foreground shadow-e4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Clock3 className="size-5" />
              </div>
              <button
                type="button"
                onClick={() => {
                  void trackFeature(featureEvents.throwbackOpened)
                  push('Person', {
                    personId: String(throwback.personId),
                    view: 'timeline',
                  })
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-semibold text-foreground">
                  1년 전 오늘
                  <span className="ml-2 text-caption font-medium text-muted-foreground">
                    {throwback.occurredDate}
                  </span>
                </p>
                <p
                  data-amp-mask
                  className="mt-1 line-clamp-2 text-label font-medium text-muted-foreground"
                >
                  {throwback.title ?? `작년 이맘때 ${throwback.personName}`}
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setThrowbackExiting(true)
                  void trackFeature(featureEvents.throwbackDismissed)
                }}
                disabled={throwbackExiting}
                className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Card>
          </div>
        </div>
      ) : null}
    </TabShell>
  )
}
