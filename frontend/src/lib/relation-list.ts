import type { PersonNode } from '@/apis/generated/mongle-api.schemas'

/** 관계태그 필터 매칭. 한 번에 한 태그만 켜지고, null(전체)은 전부 매칭이다. */
export function personMatchesTag(
  person: Pick<PersonNode, 'relationTags'>,
  selectedTagId: number | null,
) {
  if (selectedTagId == null) return true
  return person.relationTags.some((tag) => tag.id === selectedTagId)
}
