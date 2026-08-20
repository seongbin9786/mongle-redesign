import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { ZoneResponse } from '@/apis/generated/mongle-api.schemas'

// 존 한 줄. 태그 설정 줄과 달리 '누르면 들어간다'가 주 동작이다 —
// 존은 이름보다 '누가 담겨 있나'가 본체라, 이름 수정·삭제는 오른쪽 보조 버튼으로 밀어 둔다.
export function ZoneSettingRow({
  zone,
  deletePending,
  onOpen,
  onEdit,
  onDelete,
}: {
  zone: ZoneResponse
  deletePending: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex min-h-11 items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-opacity active:opacity-70"
      >
        <span
          className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: zone.color ?? 'var(--muted-soft)' }}
          aria-hidden
        />
        {/* 존 이름은 사용자가 지은 말이라 마스킹 대상이다(analytics.ts 마스킹 계약). */}
        <span
          data-amp-mask
          className="min-w-0 truncate text-body font-semibold text-foreground"
        >
          {zone.name}
        </span>
        <span className="shrink-0 text-caption font-medium text-muted-foreground">
          {zone.personIds.length}명
        </span>
        <ChevronRight className="ml-auto size-4 shrink-0 text-muted-soft" />
      </button>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onEdit}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="존 이름 수정"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deletePending}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
          aria-label="삭제"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
