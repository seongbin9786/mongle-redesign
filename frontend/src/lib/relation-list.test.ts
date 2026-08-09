import { describe, expect, it } from 'vitest'
import type { PersonNode } from '@/apis/generated/mongle-api.schemas'
import { personMatchesTags } from './relation-list'

function person(
  id: number,
  name: string,
  options: Partial<PersonNode> = {},
): PersonNode {
  return {
    id,
    name,
    profileImageUrl: null,
    avatarGender: null,
    favorite: false,
    recordCount: 1,
    relationTags: [],
    intimacy: { status: 'NORMAL', daysSinceLastMeet: null },
    firstMetDate: null,
    ...options,
  }
}

describe('personMatchesTags', () => {
  const tagged = person(1, '가', {
    relationTags: [{ id: 10, label: '친구', color: '#F97316' }],
  })

  it('미선택이면 전체 매칭, 선택 태그 하나라도 가지면 매칭(OR)', () => {
    expect(personMatchesTags(tagged, [])).toBe(true)
    expect(personMatchesTags(tagged, [10, 20])).toBe(true)
    expect(personMatchesTags(tagged, [20])).toBe(false)
  })
})
