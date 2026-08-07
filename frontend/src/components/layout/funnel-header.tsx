import { ChevronLeft, Save } from 'lucide-react'

// 퍼널 단계 공통 헤더: 뒤로 / 가운데 라벨 / (선택) 저장.
// pt는 노치(safe-area) 대응, 라벨의 data-amp-mask는 Session Replay 마스킹(mustpass #111).
// FormPageHeader와는 다른 변형이다 — 퍼널 전용이라 재사용하지 않는다.
export function FunnelHeader({
  onBack,
  centerLabel,
  onSave,
  saving,
}: {
  onBack: () => void
  centerLabel?: string
  onSave?: () => void
  saving?: boolean
}) {
  return (
    <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로"
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground"
      >
        <ChevronLeft className="size-6" />
      </button>
      <span data-amp-mask className="text-base font-semibold">
        {centerLabel}
      </span>
      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-label="저장"
          className="flex size-9 items-center justify-center rounded-full text-foreground/70 disabled:opacity-50"
        >
          <Save className="size-6" />
        </button>
      ) : (
        <span className="size-9" />
      )}
    </header>
  )
}
