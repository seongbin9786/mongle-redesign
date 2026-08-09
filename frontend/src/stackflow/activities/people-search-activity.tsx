import type { ActivityComponentType } from '@stackflow/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { personMutation } from '@/apis/mutations'
import { homeQuery, personQuery } from '@/apis/queries'
import { BackButton } from '@/components/layout/back-button'
import { PeopleSearchHistoryList } from '@/components/person/people-search-history-list'
import { PersonDirectoryRow } from '@/components/person/person-directory-row'
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { ListGroup } from '@/components/ui/list-group'
import { ScrollBody } from '@/components/ui/scroll-body'
import { StatusMessage } from '@/components/ui/status-message'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { isImeComposing } from '@/lib/keyboard'
import {
  addPeopleSearchHistory,
  clearPeopleSearchHistory,
  getPeopleSearchHistory,
  removePeopleSearchHistory,
} from '@/lib/people-search-history'
import { ActivityShell } from '@/stackflow/components/activity-shell'
import { useAppFlow } from '@/stackflow/use-app-flow'

/**
 * 사람 검색 전용 화면. 목록 화면에서 검색창을 뺀 대신 여기로 들어온다.
 *
 * 입력값(draft)과 실제로 조회할 검색어(submitted)를 나눠 든다 — 한 글자마다 서버를
 * 두드리지 않고, 확정된 검색만 최근 검색어에 남기기 위해서다.
 */
export const PeopleSearchActivity: ActivityComponentType<
  'PeopleSearch'
> = () => {
  const { pop, push } = useAppFlow()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [history, setHistory] = useState<string[]>(() =>
    getPeopleSearchHistory(),
  )

  // 검색하러 들어온 화면이라 커서를 미리 놓아 준다.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const keyword = submitted.trim()
  const resultsQuery = useQuery({
    ...personQuery.list(keyword, 'RECENT'),
    enabled: keyword.length > 0,
  })

  const favoriteMutation = useMutation({
    ...personMutation.toggleFavoriteById(),
    onSuccess: () => {
      void trackFeature(featureEvents.personFavoriteToggled)
      void queryClient.invalidateQueries({ queryKey: personQuery.allKey })
      void queryClient.invalidateQueries({ queryKey: homeQuery.allKey })
    },
  })

  const runSearch = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    setDraft(trimmed)
    setSubmitted(trimmed)
    setHistory(addPeopleSearchHistory(trimmed))
    void trackFeature(featureEvents.peopleSearchUsed)
  }

  const resetSearch = () => {
    setDraft('')
    setSubmitted('')
    inputRef.current?.focus()
  }

  const results = resultsQuery.data ?? []

  return (
    <ActivityShell layout="fixed">
      <header className="shrink-0 pb-4">
        <div className="flex items-center gap-2">
          <BackButton onClick={() => pop()} />
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (isImeComposing(event)) return
                if (event.key === 'Enter') runSearch(draft)
              }}
              enterKeyHint="search"
              placeholder="이름·소속·태그 검색"
              aria-label="사람 검색어"
              data-amp-mask
              className="h-10 rounded-full border-border bg-card pr-10 pl-9 text-body"
            />
            {draft ? (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={resetSearch}
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <ScrollBody pad="screen" className="space-y-3">
        {!keyword ? (
          <PeopleSearchHistoryList
            terms={history}
            onSelect={runSearch}
            onRemove={(term) => setHistory(removePeopleSearchHistory(term))}
            onClearAll={() => setHistory(clearPeopleSearchHistory())}
          />
        ) : resultsQuery.isPending ? (
          <StatusMessage inset="list">검색하는 중…</StatusMessage>
        ) : resultsQuery.isError ? (
          <StatusMessage tone="error" inset="list">
            검색하지 못했어요. 잠시 후 다시 시도해 주세요.
          </StatusMessage>
        ) : results.length === 0 ? (
          <EmptyState className="py-14">
            <EmptyStateTitle>검색 결과가 없어요</EmptyStateTitle>
            <EmptyStateDescription data-amp-mask className="mt-2 max-w-[260px]">
              {`'${keyword}'에 해당하는 사람을 찾지 못했어요. 이름 대신 소속이나 태그로도 찾을 수 있어요.`}
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <>
            <p className="px-1 text-caption font-medium text-muted-foreground">
              검색 결과 {results.length}명
            </p>
            <ListGroup>
              {results.map((person, index) => (
                <PersonDirectoryRow
                  key={person.id}
                  person={person}
                  withDivider={index < results.length - 1}
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
    </ActivityShell>
  )
}
