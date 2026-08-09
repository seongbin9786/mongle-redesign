import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import type { GetPersonsSort } from '@/apis/generated/mongle-api.schemas'
import { personMutation } from '@/apis/mutations'
import { homeQuery, personQuery } from '@/apis/queries'
import { MongleLogo } from '@/components/brand/mongle-logo'
import { PersonDirectoryRow } from '@/components/person/person-directory-row'
import { PersonSortSelect } from '@/components/person/person-sort-select'
import { Button } from '@/components/ui/button'
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@/components/ui/empty-state'
import { ListGroup } from '@/components/ui/list-group'
import { ListGroupItem } from '@/components/ui/list-group-item'
import { PageTitle } from '@/components/ui/page-title'
import { ScrollBody } from '@/components/ui/scroll-body'
import { StatusMessage } from '@/components/ui/status-message'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { getUserIdentity } from '@/lib/user-identity'
import { TabShell } from '@/stackflow/components/tab-shell'
import { useAppFlow } from '@/stackflow/use-app-flow'

export function PeopleTab() {
  const { push } = useAppFlow()
  // 기본은 마지막 만남 순 — 이 화면에서 가장 먼저 답해야 하는 질문이
  // "누구를 오래 못 봤나"이기 때문(mustpass people-directory).
  const [sort, setSort] = useState<GetPersonsSort>('RECENT')
  const queryClient = useQueryClient()

  // 검색은 전용 화면(PeopleSearch)이 맡는다 — 목록은 검색어를 들고 있지 않는다.
  const personsQuery = useQuery(personQuery.list(undefined, sort))

  const favoriteMutation = useMutation({
    ...personMutation.toggleFavoriteById(),
    onSuccess: () => {
      void trackFeature(featureEvents.personFavoriteToggled)
      void queryClient.invalidateQueries({ queryKey: personQuery.allKey })
      void queryClient.invalidateQueries({ queryKey: homeQuery.allKey })
    },
  })

  const persons = personsQuery.data ?? []
  const username = getUserIdentity()?.username

  const handleSortChange = (next: GetPersonsSort) => {
    if (next === sort) return
    setSort(next)
    void trackFeature(featureEvents.peopleSortChanged, {
      sort: next.toLowerCase(),
    })
  }

  return (
    <TabShell layout="fixed">
      <header className="shrink-0 pb-4">
        <MongleLogo className="mb-5 text-foreground" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <PageTitle data-amp-mask className="truncate">
              {username ? `${username}님의 사람` : '사람'}
            </PageTitle>
            <p className="mt-2 text-[12px] font-medium text-muted-foreground">
              {persons.length > 0
                ? `함께한 사람 ${persons.length}명`
                : '함께한 사람을 찾고 관리해요'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => push('PersonNew', {})}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label font-semibold text-primary-foreground"
            >
              <Plus className="size-4" />
              추가
            </button>
            <button
              type="button"
              aria-label="사람 검색"
              onClick={() => push('PeopleSearch', {})}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors active:bg-muted"
            >
              <Search className="size-4.5" />
            </button>
          </div>
        </div>
      </header>

      <ScrollBody pad="tabbar" className="space-y-3">
        {favoriteMutation.isError ? (
          <p className="text-center text-xs font-bold text-destructive">
            즐겨찾기를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}

        {personsQuery.isPending ? (
          <StatusMessage inset="list">사람 목록을 불러오는 중…</StatusMessage>
        ) : personsQuery.isError ? (
          <StatusMessage tone="error" inset="list">
            사람 목록을 불러오지 못했어요.
          </StatusMessage>
        ) : persons.length === 0 ? (
          <ListGroup>
            <ListGroupItem withDivider={false} className="py-12">
              <EmptyState>
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-background/80 text-2xl dark:bg-background/40">
                  👤
                </div>
                <EmptyStateTitle>아직 기록한 사람이 없어요</EmptyStateTitle>
                <EmptyStateDescription className="mt-2 max-w-[240px]">
                  첫 사람을 추가하고 관계를 남겨보세요.
                </EmptyStateDescription>
                <EmptyStateAction>
                  <Button
                    type="button"
                    size="cta"
                    onClick={() => push('PersonNew', {})}
                  >
                    <Plus className="size-4" />
                    사람 추가
                  </Button>
                </EmptyStateAction>
              </EmptyState>
            </ListGroupItem>
          </ListGroup>
        ) : (
          <>
            {/* 즐겨찾기는 섹션이 아니라 정렬 우선순위로만 드러난다 — 목록은 하나의 그룹이다. */}
            <div className="flex justify-end">
              <PersonSortSelect value={sort} onValueChange={handleSortChange} />
            </div>
            <ListGroup>
              {persons.map((person, index) => (
                <PersonDirectoryRow
                  key={person.id}
                  person={person}
                  withDivider={index < persons.length - 1}
                  onSelect={(personId) =>
                    push('Person', { personId: String(personId) })
                  }
                  onToggleFavorite={(personId) =>
                    favoriteMutation.mutate(personId)
                  }
                />
              ))}
            </ListGroup>
          </>
        )}
      </ScrollBody>
    </TabShell>
  )
}
