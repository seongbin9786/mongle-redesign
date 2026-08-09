import { Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { RelationTagColorPicker } from '@/components/settings/relation-tag-color-picker'
import { isImeComposing } from '@/lib/keyboard'

// 칩 이름(+색) 인라인 편집 줄. 관계 태그 패널과 소속 패널이 같은 편집 경험을 갖도록
// 한 부품으로 모았다 — 저장/취소 키(Enter·Esc)와 글자수 상한이 화면마다 달라지면 안 된다.
export function TagInlineEditor({
  label,
  onLabelChange,
  color,
  onColorChange,
  pending = false,
  onSave,
  onCancel,
}: {
  label: string
  onLabelChange: (label: string) => void
  /** 색을 다루지 않는 칩(하위 소속 등)은 넘기지 않는다. */
  color?: string
  onColorChange?: (color: string) => void
  pending?: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3">
      <div className="flex h-10 items-center gap-1 rounded-lg border border-border px-2 pl-3">
        <Input
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          onKeyDown={(event) => {
            if (isImeComposing(event)) return
            if (event.key === 'Enter') onSave()
            if (event.key === 'Escape') onCancel()
          }}
          maxLength={10}
          autoFocus
          disabled={pending}
          className="h-7 min-w-0 border-0 bg-transparent px-0 text-[14px] font-semibold shadow-none focus-visible:ring-0 md:text-[14px]"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={!label.trim() || pending}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 disabled:opacity-40"
          aria-label="저장"
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="수정 취소"
        >
          <X className="size-4" />
        </button>
      </div>
      {color !== undefined && onColorChange ? (
        <RelationTagColorPicker value={color} onChange={onColorChange} />
      ) : null}
    </div>
  )
}
