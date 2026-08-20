import { describe, expect, it } from 'vitest'
import {
  INTIMACY_HIGH_COLOR,
  INTIMACY_LOW_COLOR,
  INTIMACY_MID_COLOR,
  clampIntimacy,
  intimacyColor,
  intimacyStrokeWidth,
} from '@/lib/intimacy-scale'

describe('intimacy scale', () => {
  it('양 끝은 팔레트 색, 가운데는 앱 기본 먹색이 그대로 나온다', () => {
    // 섞는 비율이 0%면 남는 건 상대 색 하나뿐이다 — 세 지점의 색이 그대로 보장된다.
    expect(intimacyColor(0)).toBe(
      `color-mix(in oklab, ${INTIMACY_MID_COLOR} 0%, ${INTIMACY_LOW_COLOR})`,
    )
    expect(intimacyColor(50)).toBe(
      `color-mix(in oklab, ${INTIMACY_MID_COLOR} 100%, ${INTIMACY_LOW_COLOR})`,
    )
    expect(intimacyColor(100)).toBe(
      `color-mix(in oklab, ${INTIMACY_HIGH_COLOR} 100%, ${INTIMACY_MID_COLOR})`,
    )
  })

  it('가운데 색은 테마 토큰을 가리킨다(hex 로 베끼지 않는다)', () => {
    expect(INTIMACY_MID_COLOR).toBe('var(--foreground)')
  })

  it('가운데를 넘으면 빨강 쪽으로, 못 미치면 파랑 쪽으로 섞는다', () => {
    expect(intimacyColor(25)).toContain(INTIMACY_LOW_COLOR)
    expect(intimacyColor(75)).toContain(INTIMACY_HIGH_COLOR)
  })

  it('눈금 밖 값과 소수는 0~100 정수로 조인다', () => {
    expect(clampIntimacy(-20)).toBe(0)
    expect(clampIntimacy(140)).toBe(100)
    expect(clampIntimacy(49.6)).toBe(50)
    expect(clampIntimacy(Number.NaN)).toBe(50)
  })

  it('친밀도가 높을수록 선이 굵어진다', () => {
    expect(intimacyStrokeWidth(0)).toBeLessThan(intimacyStrokeWidth(100))
  })
})
