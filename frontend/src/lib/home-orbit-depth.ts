// 홈 궤도의 거리감 표현 선택. 화면 위 토글로 바꾸고 다음 방문에도 유지한다.
// (home-period와 같은 구조 — Main activity가 홈 탭을 hidden으로만 유지해서
//  리마운트되지 않으므로, 값이 바뀌면 구독으로 즉시 전달해야 한다.)

/** 눕힌 궤도판(tilt) / 초점 심도(focus). */
export type OrbitDepthMode = 'tilt' | 'focus'

export const ORBIT_DEPTH_STORAGE_KEY = 'mongle:home-orbit-depth:v1'

/** 기울인 평면이 기본이다 — 거리감이 가장 강하고 궤도 은유가 살아난다. */
export const DEFAULT_ORBIT_DEPTH: OrbitDepthMode = 'tilt'

export function isOrbitDepthMode(value: string): value is OrbitDepthMode {
  return value === 'tilt' || value === 'focus'
}

export function getOrbitDepth(): OrbitDepthMode {
  try {
    const stored = localStorage.getItem(ORBIT_DEPTH_STORAGE_KEY)
    if (stored && isOrbitDepthMode(stored)) return stored
  } catch {
    // private browsing 등
  }
  return DEFAULT_ORBIT_DEPTH
}

type Listener = (mode: OrbitDepthMode) => void

const listeners = new Set<Listener>()

export function subscribeOrbitDepth(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setOrbitDepth(mode: OrbitDepthMode) {
  try {
    localStorage.setItem(ORBIT_DEPTH_STORAGE_KEY, mode)
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener(mode))
}
