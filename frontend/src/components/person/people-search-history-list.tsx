import { Clock3, X } from 'lucide-react'

// 최근 검색어는 "다시 찾아볼 사람"의 지름길이라 목록보다 먼저 눈에 들어와야 하고,
// 동시에 지우기 쉬워야 한다 — 개별 삭제(항목 X)와 전체 지우기를 함께 둔다.
export function PeopleSearchHistoryList({
  terms,
  onSelect,
  onRemove,
  onClearAll,
}: {
  terms: string[]
  onSelect: (term: string) => void
  onRemove: (term: string) => void
  onClearAll: () => void
}) {
  if (terms.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-caption font-medium text-muted-foreground">
        최근 검색한 기록이 없어요.
      </p>
    )
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-caption font-semibold text-muted-foreground">
          최근 검색어
        </h2>
        <button
          type="button"
          onClick={onClearAll}
          className="text-caption font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          전체 지우기
        </button>
      </div>
      <ul className="divide-y divide-border/60">
        {terms.map((term) => (
          <li key={term} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(term)}
              className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 text-left transition-colors active:opacity-70"
            >
              <Clock3 className="size-4 shrink-0 text-muted-foreground/60" />
              <span
                data-amp-mask
                className="truncate text-label font-medium text-foreground"
              >
                {term}
              </span>
            </button>
            <button
              type="button"
              aria-label={`'${term}' 검색 기록 삭제`}
              onClick={() => onRemove(term)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
