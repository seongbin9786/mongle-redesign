import { cn } from '@/lib/utils'

// 다음 단계로. 하단을 여백 없이 채운다.
// record는 전체 스크롤이라 CTA를 sticky로 바닥 고정, person-new는 껍데기가 고정이라
// 불필요 (스크롤 모델 차이, mustpass person-input.md / record-input.md).
// sticky는 호출자가 넘기는 스크롤 모델 신호라 하드코딩하지 않는다.
export function NextBar({
  onNext,
  disabled = false,
  label,
  sticky,
}: {
  onNext: () => void
  disabled?: boolean
  label: string
  sticky?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onNext}
      disabled={disabled}
      className={cn(
        'w-full bg-foreground/85 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-lg font-semibold text-background disabled:opacity-30',
        sticky && 'sticky bottom-0',
      )}
    >
      {label}
    </button>
  )
}
