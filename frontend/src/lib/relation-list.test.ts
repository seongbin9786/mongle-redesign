import { describe, expect, it } from 'vitest'
import type { PersonNode } from '@/apis/generated/mongle-api.schemas'
import { personMatchesTag } from './relation-list'

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

describe('personMatchesTag', () => {
  const tagged = person(1, '가', {
    relationTags: [{ id: 10, label: '친구', color: '#F97316' }],
  })

  it('전체(null)는 모두 매칭, 켜진 태그를 가진 사람만 매칭', () => {
    expect(personMatchesTag(tagged, null)).toBe(true)
    expect(personMatchesTag(tagged, 10)).toBe(true)
    expect(personMatchesTag(tagged, 20)).toBe(false)
  })
})
