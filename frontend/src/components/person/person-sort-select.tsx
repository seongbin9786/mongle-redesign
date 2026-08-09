import type { GetPersonsSort } from '@/apis/generated/mongle-api.schemas'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// 정렬은 목록을 훑는 보조 장치라 폭을 다 먹는 세그먼트 탭이 아니라 sm(32px) Select 를 쓴다
// (mustpass people-directory). 순서는 사용자가 실제로 자주 쓰는 순 — 마지막 만남이 기본.
export const PERSON_SORT_OPTIONS = [
  { value: 'RECENT', label: '마지막 만남 순' },
  { value: 'RECORD_COUNT', label: '기록 많은 순' },
  { value: 'NAME', label: '이름 순' },
] as const satisfies ReadonlyArray<{ value: GetPersonsSort; label: string }>

export function PersonSortSelect({
  value,
  onValueChange,
  className,
}: {
  value: GetPersonsSort
  onValueChange: (value: GetPersonsSort) => void
  className?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as GetPersonsSort)}
    >
      <SelectTrigger
        size="sm"
        aria-label="정렬 기준"
        className={cn(
          'border-border/70 pr-2.5 pl-3 text-caption font-medium text-muted-foreground',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERSON_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
