import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListGroupInset } from '@/components/ui/list-group-inset'
import { isImeComposing } from '@/lib/keyboard'
import { normalizeChipColor } from '@/lib/relation-tag-colors'

// 새 칩 이름을 받는 한 줄. 관계 태그·소속(루트/하위)이 모두 이 줄을 쓴다.
// swatch 는 만들 색을 미리 보여주는 용도라 색이 없는 칩(하위 소속)에는 넘기지 않는다.
export function TagCreateRow({
  value,
  onChange,
  onSubmit,
  placeholder,
  swatchColor,
  pending = false,
  autoFocus = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  swatchColor?: string
  pending?: boolean
  autoFocus?: boolean
  className?: string
}) {
  return (
    <ListGroupInset
      className={`flex items-center gap-2 px-3 ${className ?? ''}`}
    >
      {swatchColor ? (
        <span
          className="size-6 shrink-0 rounded-full border border-background shadow-sm ring-1 ring-border"
          style={{ backgroundColor: normalizeChipColor(swatchColor) }}
          aria-hidden
        />
      ) : null}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={10}
        autoFocus={autoFocus}
        onKeyDown={(event) => {
          if (isImeComposing(event)) return
          if (event.key === 'Enter') onSubmit()
        }}
        className="h-9 border-0 bg-transparent text-[14px] shadow-none focus-visible:ring-0"
      />
      <Button
        variant="outline"
        size="pill-sm"
        disabled={!value.trim() || pending}
        onClick={onSubmit}
        className="shrink-0 border-border/60"
      >
        <Plus className="size-3.5" />
        추가
      </Button>
    </ListGroupInset>
  )
}
