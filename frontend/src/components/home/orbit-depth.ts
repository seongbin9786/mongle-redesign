import type { OrbitDepthMode } from '@/lib/home-orbit-depth'

// 궤도의 '거리감' 표현. 위치만으로도 최근성은 읽히지만, 평면에 늘어놓으면
// 바깥 사람도 안쪽 사람과 똑같은 무게로 보인다. 멀어질수록 물러나 보이게 하는
// 시각 단서를 한 곳에 모아 둔다.
//
// distance는 '중심에서 얼마나 멀리 있나'를 0~1로 정규화한 값이다
// (기준은 사람이 앉은 가장 바깥 눈금 = focusRadius, 그 밖은 1로 자른다).

export type OrbitDepthStyle = {
  opacity: number
  scale: number
  /** 없으면 undefined. filter는 3D를 평면화하므로 세우기와 다른 레이어에 건다. */
  filter?: string
}

/** 궤도판을 눕히는 각도. tilt에서만 쓴다. */
export const ORBIT_TILT_DEG = 46

const lerp = (from: number, to: number, t: number) => from + (to - from) * t

export function orbitDepthStyle(
  mode: OrbitDepthMode,
  distance: number,
): OrbitDepthStyle {
  const t = Math.min(1, Math.max(0, distance))

  if (mode === 'focus') {
    // 심도 — 초점이 '나'에 맞춰져 있고 바깥은 아웃포커스로 풀린다.
    return {
      opacity: lerp(1, 0.72, t),
      scale: lerp(1, 0.9, t),
      filter: `blur(${lerp(0, 2.2, t * t).toFixed(2)}px) saturate(${lerp(1, 0.75, t).toFixed(2)})`,
    }
  }

  // 기울인 평면 — 궤도판 자체를 눕혀 바깥이 지평선으로 물러난다.
  // 원근 변환이 크기·간격을 알아서 줄이므로 여기서는 공기 원근만 얹는다.
  return {
    opacity: lerp(1, 0.68, t),
    scale: 1,
    filter: `saturate(${lerp(1, 0.55, t).toFixed(2)})`,
  }
}

/** 눕힌 판에서 세로가 눌리는 비율. 붐빔을 '보이는 거리'로 재는 데 쓴다. */
export function orbitVerticalSquash(mode: OrbitDepthMode): number {
  return mode === 'tilt' ? Math.cos((ORBIT_TILT_DEG * Math.PI) / 180) : 1
}
