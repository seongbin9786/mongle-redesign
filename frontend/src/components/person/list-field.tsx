import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldLabel } from '@/components/person/field-label'
import { isImeComposing } from '@/lib/keyboard'
import { cn } from '@/lib/utils'

export function ListField({
  label,
  items,
  onChange,
  placeholder = '',
  maxItems = 20,
  tone = 'neutral',
  compact = false,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  maxItems?: number
  tone?: 'neutral' | 'green' | 'red'
  compact?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const chipToneClass = {
    neutral: 'bg-muted text-foreground',
    green:
      'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    red: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  }[tone]

  const addItem = () => {
    const value = draft.trim()
    if (!value) return
    if (value.length > 30) {
      setError('최대 30자까지 쓸 수 있어요.')
      return
    }
    if (items.includes(value)) {
      setError('이미 있는 항목이에요.')
      return
    }
    if (items.length >= maxItems) {
      setError('최대 20개까지 담을 수 있어요.')
      return
    }
    onChange([...items, value])
    setDraft('')
    setError(null)
  }

  return (
    <div className="min-w-0">
      {label ? (
        <FieldLabel className={cn('block', compact ? 'mb-2' : 'mb-2')}>
          {label}
        </FieldLabel>
      ) : null}
      <div
        className={cn(
          'flex gap-2',
          compact
            ? 'flex-col items-stretch sm:flex-row sm:items-start'
            : 'flex-row',
          !compact && (items.length > 0 ? 'items-start' : 'items-center'),
        )}
      >
        <div
          className={cn(
            'flex h-10 min-h-10 min-w-0 max-w-full flex-1 flex-wrap items-center gap-1.5 overflow-hidden rounded-lg border border-border bg-card px-2 shadow-xs',
            items.length > 0 && 'h-auto min-h-10 py-1.5',
            'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          )}
        >
          {items.map((item) => (
            <span
              key={item}
              className={cn(
                'inline-flex h-7 max-w-full items-center gap-1 rounded-md px-2.5 text-label font-semibold',
                chipToneClass,
              )}
            >
              <span data-amp-mask className="min-w-0 truncate">
                {item}
              </span>
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={`${item} 삭제`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
            }}
            placeholder={items.length === 0 ? placeholder : ''}
            onKeyDown={(e) => {
              if (isImeComposing(e)) return
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
            className="h-7 min-w-24 flex-1 border-0 bg-transparent px-1 text-sm leading-none outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          className={cn('h-10 shrink-0 px-4', compact && 'w-full sm:w-auto')}
        >
          추가
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
