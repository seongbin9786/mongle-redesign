import type { PersonNode } from '@/apis/generated/mongle-api.schemas'

/** 태그 필터 매칭(OR·합집합). 미선택은 전체 매칭. */
export function personMatchesTags(
  person: Pick<PersonNode, 'relationTags'>,
  selectedTagIds: number[],
) {
  if (selectedTagIds.length === 0) return true
  return person.relationTags.some((tag) => selectedTagIds.includes(tag.id))
}
