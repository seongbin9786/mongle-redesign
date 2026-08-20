import { Check } from 'lucide-react'
import type { PersonResponse } from '@/apis/generated/mongle-api.schemas'
import { ListGroupItem } from '@/components/ui/list-group-item'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import { affiliationColor, affiliationLabel } from '@/lib/affiliation'
import { formatPersonName } from '@/lib/format'
import { cn } from '@/lib/utils'

// 여러 명을 체크로 고르는 한 줄(존에 담기 / 관계도에 올리기가 같은 줄을 쓴다).
// 사람 목록(person-directory-row)과 달리 마지막 만남·즐겨찾기를 지운다 —
// 여기서 하는 판단은 '고를까 말까' 하나뿐이라, 다른 정보가 붙으면 고르는 일이 훑는 일이 된다.
export function PersonPickRow({
  person,
  selected,
  withDivider,
  onToggle,
}: {
  person: PersonResponse
  selected: boolean
  withDivider: boolean
  onToggle: () => void
}) {
  return (
    <ListGroupItem withDivider={withDivider} className="py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className="flex w-full items-center gap-3 text-left transition-opacity active:opacity-70"
      >
        <MonogramAvatar
          name={person.name}
          imageUrl={person.profileImageUrl}
          gender={person.gender}
          ringColor={affiliationColor(person.affiliation)}
          className="size-9"
        />
        <span className="min-w-0 flex-1">
          <span
            data-amp-mask
            className="block truncate text-body font-semibold text-foreground"
          >
            {formatPersonName(person)}
          </span>
          {affiliationLabel(person.affiliation) ? (
            <span
              data-amp-mask
              className="block truncate text-caption font-medium text-muted-foreground"
            >
              {affiliationLabel(person.affiliation)}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full border transition-colors',
            selected
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-card text-transparent',
          )}
          aria-hidden
        >
          <Check className="size-3.5" />
        </span>
      </button>
    </ListGroupItem>
  )
}
