import { useRef } from 'react'
import {
  INTIMACY_MAX,
  INTIMACY_MIN,
  clampIntimacy,
  intimacyColor,
} from '@/lib/intimacy-scale'
import { cn } from '@/lib/utils'

/**
 * 친밀도(0~100)를 손가락으로 끌어 정하는 바.
 *
 * 숫자 입력이 아니라 바로 두는 이유: 여기 값은 "몇 점인가"가 아니라 "얼마나 가까운가"다.
 * 62 와 65 의 차이를 사용자가 설명할 수 없으므로, 정확히 찍게 하는 대신 감으로 밀게 한다.
 * 손잡이와 지나온 구간은 그 값의 색(파랑→빨강)으로 칠해, 지도의 선 색과 같은 언어를 쓴다.
 *
 * 키보드(←/→)도 받는다 — 드래그만 되는 컨트롤은 마우스 없는 사용자에게 값이 잠긴 것과 같다.
 */
export function IntimacySlider({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const level = clampIntimacy(value)
  const color = intimacyColor(level)

  const updateFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const ratio = (clientX - rect.left) / rect.width
    onChange(clampIntimacy(ratio * INTIMACY_MAX))
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="친밀도"
      aria-valuemin={INTIMACY_MIN}
      aria-valuemax={INTIMACY_MAX}
      aria-valuenow={level}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        updateFromPointer(event.clientX)
      }}
      onPointerMove={(event) => {
        // 버튼을 누른 채 지나갈 때만 따라간다(마우스 hover 로는 값이 바뀌지 않는다).
        if (event.buttons === 0) return
        updateFromPointer(event.clientX)
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 10 : 1
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault()
          onChange(clampIntimacy(level - step))
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault()
          onChange(clampIntimacy(level + step))
        }
      }}
      className={cn(
        'relative h-11 w-full touch-none cursor-pointer select-none focus-visible:outline-none',
        className,
      )}
    >
      <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
      <div
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full"
        style={{
          width: `${level}%`,
          backgroundColor: color,
        }}
      />
      <div
        className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-e2 transition-colors"
        style={{ left: `${level}%`, backgroundColor: color }}
      />
    </div>
  )
}
