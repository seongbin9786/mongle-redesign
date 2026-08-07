import Picker from 'react-mobile-picker'
import type { PickerValue } from 'react-mobile-picker'
import { pad } from '@/lib/format'
import { cn } from '@/lib/utils'

// 네이티브 time 대신 시간을 휠 피커로 고른다. 24시간제(오전/오후 열 없이).
// 한 번에 5칸(가운데+위아래 2칸).
const ITEM_H = 40
const HEIGHT = 5 * ITEM_H
const HOURS24 = Array.from({ length: 24 }, (_, i) => String(i))
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5))

function currentTime() {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(Math.floor(now.getMinutes() / 5) * 5)}`
}

function parseTime(v: string): PickerValue {
  if (!v) return { hour: '9', minute: '00' }
  const [H, M] = v.split(':').map(Number)
  return { hour: String(H), minute: pad(Math.floor(M / 5) * 5) }
}
function toTime(pv: PickerValue) {
  return `${pad(Number(pv.hour))}:${pv.minute}`
}

function Item({ label }: { label: string }) {
  return (
    <Picker.Item value={label}>
      {({ selected }: { selected: boolean }) => (
        <span
          className={cn(
            'tabular-nums transition-all',
            selected
              ? 'text-2xl font-semibold text-foreground/75'
              : 'text-base text-muted-foreground/40',
          )}
        >
          {label}
        </span>
      )}
    </Picker.Item>
  )
}

export function TimeWheel({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const unknown = value === ''
  const pv = parseTime(value)
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-muted/40 p-1">
        <button
          type="button"
          aria-pressed={!unknown}
          onClick={() => {
            if (unknown) onChange(currentTime())
          }}
          className={cn(
            'rounded-lg px-3 py-2 text-sm transition-colors',
            !unknown
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground',
          )}
        >
          시간 입력
        </button>
        <button
          type="button"
          aria-pressed={unknown}
          onClick={() => onChange('')}
          className={cn(
            'rounded-lg px-3 py-2 text-sm transition-colors',
            unknown
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground',
          )}
        >
          시간 모름
        </button>
      </div>
      {!unknown && (
        <>
          <div className="mb-1.5 flex gap-3 px-2">
            <span className="flex-1 text-center text-xs text-muted-foreground">
              시
            </span>
            <span className="flex-1 text-center text-xs text-muted-foreground">
              분
            </span>
          </div>
          <Picker
            value={pv}
            onChange={(next) => onChange(toTime(next))}
            height={HEIGHT}
            itemHeight={ITEM_H}
            wheelMode="natural"
            className="gap-3"
          >
            <Picker.Column name="hour" className="rounded-2xl bg-muted/40">
              {HOURS24.map((v) => (
                <Item key={v} label={v} />
              ))}
            </Picker.Column>
            <Picker.Column name="minute" className="rounded-2xl bg-muted/40">
              {MINUTES.map((v) => (
                <Item key={v} label={v} />
              ))}
            </Picker.Column>
          </Picker>
        </>
      )}
    </div>
  )
}
