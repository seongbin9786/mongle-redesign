import type { ChipRef } from '@/apis/generated/mongle-api.schemas'
import { coloredTagStyle } from '@/lib/relation-tag-colors'
import { cn } from '@/lib/utils'

// 홈 궤도의 관계태그 필터. 한 번에 한 칩만 켠다 — 여러 칩을 겹쳐 켜면
// '지금 무슨 기준으로 보고 있는지'가 흐려져 흐림(dim)이 읽히지 않는다.
// 숨기지 않고 흐리는 정책이라 서버 필터가 아니라 클라이언트 흐림으로 쓴다.
export function RelationTagFilter({
  tags,
  selectedId,
  onSelect,
}: {
  tags: ChipRef[]
  selectedId: number | null
  /** null이면 '전체'. 켜진 칩을 다시 누르면 null로 돌아온다. */
  onSelect: (tagId: number | null) => void
}) {
  return (
    <div
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="관계태그 필터"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selectedId == null}
        className={cn(
          'inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-label font-medium transition-colors',
          selectedId == null
            ? 'border-foreground bg-foreground text-background'
            : 'border-border bg-card text-foreground',
        )}
      >
        전체
      </button>
      {tags.map((tag) => {
        const selected = selectedId === tag.id
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onSelect(selected ? null : tag.id)}
            aria-pressed={selected}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-label font-medium transition-colors',
              !selected && 'border-border bg-card text-foreground',
            )}
            style={selected ? coloredTagStyle(tag.color) : undefined}
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                backgroundColor: selected
                  ? 'currentColor'
                  : (tag.color ?? 'currentColor'),
              }}
            />
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
