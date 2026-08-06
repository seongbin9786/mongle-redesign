import { describe, expect, it } from 'vitest'
import { DEFAULT_TAG_COLOR, primaryTagColor } from './relation-tag-colors'

describe('primaryTagColor', () => {
  it('첫 관계태그의 색을 대문자 hex로 돌려준다', () => {
    expect(
      primaryTagColor([
        { id: 1, label: '친구', color: '#f97316' },
        { id: 2, label: '가족', color: '#E85D75' },
      ]),
    ).toBe('#F97316')
  })

  it('첫 태그의 색이 없거나 잘못된 hex면 기본색으로 정규화한다', () => {
    expect(primaryTagColor([{ id: 1, label: '가족', color: null }])).toBe(
      DEFAULT_TAG_COLOR,
    )
    expect(
      primaryTagColor([{ id: 1, label: '가족', color: 'not-a-hex' }]),
    ).toBe(DEFAULT_TAG_COLOR)
  })

  it('태그가 없으면 null이라 화면은 무채색을 유지한다', () => {
    expect(primaryTagColor([])).toBeNull()
    expect(primaryTagColor(undefined)).toBeNull()
    expect(primaryTagColor(null)).toBeNull()
  })
})
