import type { PersonNode } from '@/apis/generated/mongle-api.schemas'
import { personNodeProps } from '@/components/home/person-node-marker'
import { Button } from '@/components/ui/button'
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateTitle,
} from '@/components/ui/empty-state'
import { ListGroup } from '@/components/ui/list-group'
import { ListGroupItem } from '@/components/ui/list-group-item'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import { TagChip } from '@/components/ui/tag-chip'
import { formatPersonName } from '@/lib/format'
import { formatDaysSinceLastMeet } from '@/lib/relation-orbit-layout'
import { personMatchesTags, sortHomeListPersons } from '@/lib/relation-list'
import { cn } from '@/lib/utils'

// 궤도의 목록 표현(PRD §4). 정렬은 고정(즐겨찾기 상단 → 최근 만난 순 →
// 가나다), 태그 필터는 궤도와 달리 숨김으로 적용한다 — 목록은 디렉터리
// 개요용이라 흐림보다 결과만 보여주는 쪽이 읽기 좋다.
export function RelationListView({
  nodes,
  selectedTagIds,
  onSelectPerson,
  onClearFilter,
}: {
  nodes: PersonNode[]
  selectedTagIds: number[]
  onSelectPerson: (personId: number) => void
  onClearFilter: () => void
}) {
  const visible = sortHomeListPersons(
    nodes.filter((node) => personMatchesTags(node, selectedTagIds)),
  )

  if (visible.length === 0) {
    return (
      <EmptyState>
        <EmptyStateTitle>이 조건에 맞는 사람이 없어요.</EmptyStateTitle>
        <EmptyStateAction>
          <Button variant="outline-foreground" onClick={onClearFilter}>
            필터 초기화
          </Button>
        </EmptyStateAction>
      </EmptyState>
    )
  }

  return (
    <ListGroup>
      {visible.map((person, index) => {
        const displayName = formatPersonName(person)
        const lastMeet = formatDaysSinceLastMeet(
          person.intimacy.daysSinceLastMeet,
        )
        return (
          <ListGroupItem
            key={person.id}
            withDivider={index < visible.length - 1}
            className="relative py-3"
          >
            <button
              type="button"
              {...personNodeProps}
              onClick={() => onSelectPerson(person.id)}
              className="flex w-full items-center gap-3 text-left transition-opacity active:opacity-70"
            >
              <MonogramAvatar
                name={person.name}
                imageUrl={person.profileImageUrl}
                gender={person.avatarGender}
                personId={person.id}
                favorite={person.favorite}
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
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      관계 정보 없음
                    </span>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 text-caption font-medium',
                  person.intimacy.daysSinceLastMeet == null
                    ? 'text-muted-foreground/70'
                    : 'text-muted-foreground',
                )}
              >
                {lastMeet}
              </span>
            </button>
          </ListGroupItem>
        )
      })}
    </ListGroup>
  )
}
