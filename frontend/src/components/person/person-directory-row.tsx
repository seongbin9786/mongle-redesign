import { Star } from 'lucide-react'
import type { PersonResponse } from '@/apis/generated/mongle-api.schemas'
import { ListGroupItem } from '@/components/ui/list-group-item'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import {
  affiliationColor,
  affiliationDetailLabel,
  affiliationLabel,
} from '@/lib/affiliation'
import { formatLastMetRelative, formatPersonName } from '@/lib/format'
import { cn } from '@/lib/utils'

// 목록 한 줄의 정보 위계는 이름 → 마지막 만남 → 소속 → 태그다(mustpass people-directory).
// 그래서 마지막 만남만 foreground 굵기를 쓰고 나머지 보조 정보는 muted 로 눌러 둔다.
// 소속은 컬러 chip 대신 아바타 ring 색으로만 색을 갖는다 — 한 줄에 색이 두 군데 이상
// 나타나면 무엇이 그 사람의 소속인지 읽히지 않는다.

export function PersonDirectoryRow({
  person,
  withDivider,
  onSelect,
  onToggleFavorite,
}: {
  person: PersonResponse
  withDivider: boolean
  onSelect: (personId: number) => void
  onToggleFavorite: (personId: number) => void
}) {
  const lastMetLabel = formatLastMetRelative(person.lastMetDate)
  const neverMet = lastMetLabel === '기록 없음'
  const rootLabel = affiliationLabel(person.affiliation)
  const detailLabel = affiliationDetailLabel(person.affiliation)
  const hasContext = Boolean(rootLabel) || person.relationTags.length > 0

  return (
    <ListGroupItem withDivider={withDivider} className="relative py-3">
      <button
        type="button"
        onClick={() => onSelect(person.id)}
        className="flex w-full items-center gap-3 pr-9 text-left transition-colors active:opacity-70"
      >
        <MonogramAvatar
          name={person.name}
          imageUrl={person.profileImageUrl}
          gender={person.gender}
          personId={person.id}
          ringColor={affiliationColor(person.affiliation)}
          className="size-11"
        />
        <div className="min-w-0 flex-1">
          <p
            data-amp-mask
            className="truncate text-body font-semibold text-foreground"
          >
            {formatPersonName(person)}
          </p>

          <p className="mt-1 flex items-baseline gap-1.5 text-label">
            {neverMet ? (
              <span className="font-medium text-muted-foreground/70">
                아직 함께한 기록이 없어요
              </span>
            ) : (
              <>
                <span className="text-caption font-medium text-muted-foreground">
                  마지막 만남
                </span>
                <span className="font-semibold text-foreground">
                  {lastMetLabel}
                </span>
              </>
            )}
          </p>

          {hasContext ? (
            <p
              data-amp-mask
              className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-caption font-medium text-muted-foreground"
            >
              {rootLabel ? <span className="shrink-0">{rootLabel}</span> : null}
              {detailLabel ? (
                // 하위 소속만 chip 형태다. 색을 주지 않아 루트의 ring 색과 경쟁하지 않는다.
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {detailLabel}
                </span>
              ) : null}
              {person.relationTags.length > 0 ? (
                <span className="truncate text-muted-foreground/80">
                  {person.relationTags.map((tag) => `#${tag.label}`).join(' ')}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </button>

      <button
        type="button"
        aria-label={person.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
        aria-pressed={person.favorite}
        onClick={() => onToggleFavorite(person.id)}
        className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
      >
        <Star
          className={cn(
            // 24px 아이콘의 75%. 즐겨찾기는 목록의 주인공이 아니라 표시일 뿐이다.
            'size-[18px]',
            person.favorite
              ? 'fill-amber-500 text-amber-500'
              : 'text-muted-foreground/40',
          )}
        />
      </button>
    </ListGroupItem>
  )
}
