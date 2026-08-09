import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChipResponseType } from '@/apis/generated/mongle-api.schemas'
import {
  chipQuery,
  eventQuery,
  homeQuery,
  personQuery,
  timelineQuery,
} from '@/apis/queries'
import { ScrollBody } from '@/components/ui/scroll-body'
import { AffiliationPanel } from '@/stackflow/activities/settings/affiliation-panel'
import { TagTypePanel } from '@/stackflow/activities/settings/tag-type-panel'

const TAG_GROUPS = [
  {
    type: 'CATEGORY' as const,
    label: '만남 태그',
    description: '기록을 구분할 때 사용해요',
  },
  {
    type: 'RELATION_TAG' as const,
    label: '관계 태그',
    description: '사람 사이의 관계를 나타내요',
  },
] satisfies ReadonlyArray<{
  type: ChipResponseType
  label: string
  description: string
}>

const MANAGED_TAG_TYPES = new Set<ChipResponseType>([
  'CATEGORY',
  'RELATION_TAG',
  'AFFILIATION',
])

export function TagSettingsPage() {
  const queryClient = useQueryClient()
  const chipsQuery = useQuery(chipQuery.all())

  const chips = (chipsQuery.data ?? []).filter((chip) =>
    MANAGED_TAG_TYPES.has(chip.type),
  )

  // 칩 라벨·색은 사람·기록·홈·타임라인 어디에나 박혀 보이므로 한 번 바뀌면 전부 무효화한다.
  const invalidateAll = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: chipQuery.allKey }),
      queryClient.invalidateQueries({ queryKey: personQuery.allKey }),
      queryClient.invalidateQueries({ queryKey: homeQuery.allKey }),
      queryClient.invalidateQueries({ queryKey: eventQuery.allKey }),
      queryClient.invalidateQueries({ queryKey: timelineQuery.allKey }),
    ])
  }

  return (
    <ScrollBody pad="screen" className="space-y-7">
      {/* 소속은 사람의 축(한 명당 하나)이라 여러 개 붙는 태그들보다 먼저 둔다. */}
      <AffiliationPanel
        chips={chips.filter((chip) => chip.type === 'AFFILIATION')}
        onChanged={invalidateAll}
      />
      {TAG_GROUPS.map((group) => (
        <TagTypePanel
          key={group.type}
          type={group.type}
          label={group.label}
          description={group.description}
          chips={chips.filter((chip) => chip.type === group.type)}
          onChanged={invalidateAll}
        />
      ))}
    </ScrollBody>
  )
}
