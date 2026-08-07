import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PersonResponse } from '@/apis/generated/mongle-api.schemas'
import { personMutation } from '@/apis/mutations'
import { homeQuery, personQuery } from '@/apis/queries'
import { MongleLogo } from '@/components/brand/mongle-logo'
import { TabShell } from '@/stackflow/components/tab-shell'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import { Button } from '@/components/ui/button'
import { PageTitle } from '@/components/ui/page-title'
import { ScrollBody } from '@/components/ui/scroll-body'
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { StatusMessage } from '@/components/ui/status-message'
import { TagChip } from '@/components/ui/tag-chip'
import { ListGroup } from '@/components/ui/list-group'
import { ListGroupInset } from '@/components/ui/list-group-inset'
import { ListGroupItem } from '@/components/ui/list-group-item'
import { ListGroupLabel } from '@/components/ui/list-group-label'

import { formatLastMetRelative, formatPersonName } from '@/lib/format'
import { cn } from '@/lib/utils'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { useAppFlow } from '@/stackflow/use-app-flow'

type PersonSort = 'NAME' | 'RECENT'

export function PeopleTab() {
  const { push } = useAppFlow()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<PersonSort>('NAME')
  const queryClient = useQueryClient()

  const personsQuery = useQuery(personQuery.list(query, sort))

  const favoriteMutation = useMutation({
    ...personMutation.toggleFavoriteById(),
    onSuccess: () => {
      void trackFeature(featureEvents.personFavoriteToggled)
      void queryClient.invalidateQueries({ queryKey: personQuery.allKey })
      void queryClient.invalidateQueries({ queryKey: homeQuery.allKey })
    },
  })

  const { favorites, others } = useMemo(() => {
    const list = personsQuery.data ?? []
    return {
      favorites: list.filter((p) => p.favorite),
      others: list.filter((p) => !p.favorite),
    }
  }, [personsQuery.data])

  const persons = personsQuery.data ?? []
  const totalCount = persons.length
  const showSections = sort === 'NAME' && !query.trim() && favorites.length > 0

  const handleQueryChange = (next: string) => {
    if (!query.trim() && next.trim()) {
      void trackFeature(featureEvents.peopleSearchUsed)
    }
    setQuery(next)
  }

  const handleSortChange = (next: PersonSort) => {
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
          <div>
            <PageTitle>사람</PageTitle>
            <p className="mt-2 text-[12px] font-medium text-muted-foreground">
              {totalCount > 0
                ? `함께한 사람 ${totalCount}명`
                : '함께한 사람을 찾고 관리해요'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => push('PersonNew', {})}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label font-semibold text-primary-foreground"
          >
            <Plus className="size-4" />
            추가
          </button>
        </div>
      </header>

      <ScrollBody pad="tabbar" className="space-y-6">
        <section>
          <ListGroup>
            <ListGroupItem>
              <ListGroupInset className="relative px-2 py-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="이름·관계 유형 검색"
                  className="h-10 border-0 bg-transparent pl-8 text-body shadow-none focus-visible:ring-0"
                />
              </ListGroupInset>
            </ListGroupItem>
            <ListGroupItem withDivider={false}>
              <ListGroupInset className="p-1">
                <SegmentedControl
                  value={sort}
                  onValueChange={handleSortChange}
                  options={[
                    { value: 'NAME', label: '이름순' },
                    { value: 'RECENT', label: '최근 만남순' },
                  ]}
                />
              </ListGroupInset>
            </ListGroupItem>
          </ListGroup>
        </section>

        {favoriteMutation.isError ? (
          <p className="text-center text-xs font-semibold text-destructive">
            즐겨찾기를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}

        {personsQuery.isPending ? (
          <StatusMessage inset="list">사람 목록을 불러오는 중…</StatusMessage>
        ) : personsQuery.isError ? (
          <StatusMessage tone="error" inset="list">
            사람 목록을 불러오지 못했어요.
          </StatusMessage>
        ) : totalCount === 0 ? (
          <PeopleEmptyState
            query={query}
            onClear={() => setQuery('')}
            onAddPerson={() => push('PersonNew', {})}
          />
        ) : showSections ? (
          <>
            <PersonSection
              title="즐겨찾기"
              persons={favorites}
              onToggleFavorite={(id) => favoriteMutation.mutate(id)}
            />
            {others.length > 0 ? (
              <PersonSection
                title="전체"
                persons={others}
                onToggleFavorite={(id) => favoriteMutation.mutate(id)}
              />
            ) : null}
          </>
        ) : (
          <PersonSection
            title={query.trim() ? '검색 결과' : '목록'}
            persons={persons}
            onToggleFavorite={(id) => favoriteMutation.mutate(id)}
          />
        )}
      </ScrollBody>
    </TabShell>
  )
}

function PersonSection({
  title,
  persons,
  onToggleFavorite,
}: {
  title: string
  persons: PersonResponse[]
  onToggleFavorite: (id: number) => void
}) {
  return (
    <section>
      <ListGroupLabel>
        {title} · {persons.length}명
      </ListGroupLabel>
      <ListGroup>
        {persons.map((person, index) => (
          <PersonListItem
            key={person.id}
            person={person}
            withDivider={index < persons.length - 1}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </ListGroup>
    </section>
  )
}

function PersonListItem({
  person,
  withDivider,
  onToggleFavorite,
}: {
  person: PersonResponse
  withDivider: boolean
  onToggleFavorite: (id: number) => void
}) {
  const lastMetLabel = formatLastMetRelative(person.lastMetDate)
  const displayName = formatPersonName(person)

  const { push } = useAppFlow()

  return (
    <ListGroupItem withDivider={withDivider} className="relative py-3">
      <button
        type="button"
        onClick={() => push('Person', { personId: String(person.id) })}
        className="flex w-full items-center gap-3 pr-10 text-left transition-colors active:opacity-70"
      >
        <MonogramAvatar
          name={person.name}
          imageUrl={person.profileImageUrl}
          gender={person.gender}
          personId={person.id}
          className="size-11"
        />
        <div className="min-w-0 flex-1">
          <p
            data-amp-mask
            className="truncate text-body font-semibold text-foreground"
          >
            {displayName}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            {person.relationType ? (
              <span
                data-amp-mask
                className="shrink-0 text-xs font-medium text-muted-foreground"
              >
                {person.relationType}
              </span>
            ) : null}
            {person.relationTags.length > 0 ? (
              <span
                data-amp-mask
                className="flex min-w-0 gap-1 overflow-hidden"
              >
                {person.relationTags.slice(0, 2).map((tag) => (
                  <TagChip
                    key={tag.id}
                    interactive={false}
                    size="xs"
                    surface="plain"
                    color={tag.color}
                    className="max-w-20"
                  >
                    <span className="truncate">{tag.label}</span>
                  </TagChip>
                ))}
              </span>
            ) : !person.relationType ? (
              <span className="text-xs font-medium text-muted-foreground">
                관계 정보 없음
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              'mt-1 text-caption font-semibold',
              lastMetLabel === '기록 없음'
                ? 'text-muted-foreground/70'
                : 'text-muted-foreground',
            )}
          >
            {lastMetLabel === '기록 없음'
              ? lastMetLabel
              : `마지막 만남 · ${lastMetLabel}`}
          </p>
        </div>
      </button>
      <button
        type="button"
        aria-label={person.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
        onClick={() => onToggleFavorite(person.id)}
        className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
      >
        <Star
          className={cn(
            'size-6',
            person.favorite
              ? 'fill-foreground text-foreground'
              : 'text-muted-foreground/40',
          )}
        />
      </button>
    </ListGroupItem>
  )
}

function PeopleEmptyState({
  query,
  onClear,
  onAddPerson,
}: {
  query: string
  onClear: () => void
  onAddPerson: () => void
}) {
  const trimmed = query.trim()

  return (
    <section>
      <ListGroup>
        <ListGroupItem withDivider={false} className="py-12">
          <EmptyState>
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-background/80 text-2xl dark:bg-background/40">
              👤
            </div>
            <EmptyStateTitle>
              {trimmed ? '검색 결과가 없어요' : '아직 기록한 사람이 없어요'}
            </EmptyStateTitle>
            <EmptyStateDescription
              data-amp-mask={trimmed ? true : undefined}
              className="mt-2 max-w-[240px]"
            >
              {trimmed
                ? `'${trimmed}'에 해당하는 사람을 찾지 못했어요.`
                : '첫 사람을 추가하고 관계를 남겨보세요.'}
            </EmptyStateDescription>
            <EmptyStateAction>
              {trimmed ? (
                <Button
                  variant="outline"
                  className="rounded-full border-border/60 bg-background"
                  onClick={onClear}
                >
                  검색 지우기
                </Button>
              ) : (
                <Button type="button" size="cta" onClick={() => onAddPerson()}>
                  <Plus className="size-4" />
                  사람 추가
                </Button>
              )}
            </EmptyStateAction>
          </EmptyState>
        </ListGroupItem>
      </ListGroup>
    </section>
  )
}
