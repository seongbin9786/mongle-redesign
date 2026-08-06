import type { CSSProperties } from 'react'
import type { ChipRef } from '@/apis/generated/mongle-api.schemas'

// 관계 태그 도메인 팔레트·색상 유틸. UI 부품 레이어(components/ui)가 아니라
// lib에 두어 도메인 지식과 표현 레이어를 분리한다. 관계태그 색을 쓰는 화면
// (홈 궤도 필터·관계 카드, 설정 색상 피커)이 공통으로 참조하는 단일 출처다.

export const RELATION_TAG_COLOR_OPTIONS = [
  { label: '로즈', value: '#E85D75' },
  { label: '코랄', value: '#F43F5E' },
  { label: '오렌지', value: '#F97316' },
  { label: '앰버', value: '#D97706' },
  { label: '라임', value: '#65A30D' },
  { label: '그린', value: '#22A06B' },
  { label: '민트', value: '#14B8A6' },
  { label: '스카이', value: '#0EA5E9' },
  { label: '블루', value: '#2563EB' },
  { label: '인디고', value: '#4F46E5' },
  { label: '바이올렛', value: '#8B5CF6' },
  { label: '퍼플', value: '#A855F7' },
  { label: '핑크', value: '#DB2777' },
  { label: '마젠타', value: '#C026D3' },
  { label: '슬레이트', value: '#475569' },
  { label: '스톤', value: '#78716C' },
] as const

export const RELATION_TAG_COLOR_PALETTE = [
  ...RELATION_TAG_COLOR_OPTIONS.map((option) => option.value),
] as const

// 색이 지정되지 않은 태그의 기본색(팔레트 첫 색 '로즈').
export const DEFAULT_TAG_COLOR = RELATION_TAG_COLOR_PALETTE[0]

export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

export function hexToRgba(hex: string, alpha: number) {
  const normalized = HEX_COLOR_PATTERN.test(hex) ? hex : DEFAULT_TAG_COLOR
  const value = normalized.slice(1)
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function normalizeChipColor(color?: string | null) {
  if (!color) return DEFAULT_TAG_COLOR
  return HEX_COLOR_PATTERN.test(color) ? color.toUpperCase() : DEFAULT_TAG_COLOR
}

// 태그 색으로 칩을 칠하는 인라인 스타일. active면 채움, 아니면 옅은 배경.
export function coloredTagStyle(
  color?: string | null,
  active = false,
): CSSProperties {
  const normalized = normalizeChipColor(color)
  return {
    backgroundColor: active ? normalized : hexToRgba(normalized, 0.12),
    borderColor: active ? normalized : hexToRgba(normalized, 0.38),
    color: active ? '#FFFFFF' : normalized,
  }
}

// 인물의 대표 그룹 색 = 첫 관계태그의 색. 태그가 여러 개여도 첫째만 대표로
// 써야 지도와 관계 카드에서 한 사람의 색이 항상 같다(관계 카드 시트도 첫
// 태그를 대표로 보여준다). 태그가 없으면 null을 돌려 화면이 무채색을 유지한다.
export function primaryTagColor(tags?: readonly ChipRef[] | null) {
  const primary = tags?.[0]
  if (!primary) return null
  return normalizeChipColor(primary.color)
}
