import Picker from 'react-mobile-picker'
import type { PickerValue } from 'react-mobile-picker'
import { cn } from '@/lib/utils'

// 연/월/일 휠 피커. PersonFormValues의 날짜 파트 문자열(YYYY / M / D)과 그대로 연동한다.
// DatePartPicker(드롭다운 3회 탐색)의 모바일 마찰 대응.
// record 퍼널 TimeWheel(time-wheel.tsx)과 같은 룩앤필.

const ITEM_H = 40
const HEIGHT = 5 * ITEM_H
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: THIS_YEAR - 1900 + 1 }, (_, i) =>
  String(THIS_YEAR - i),
)
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const UNKNOWN_YEAR = '모름'

// 연도 미상은 윤년(2000)으로 계산해 2/29 생일을 허용한다.
function daysInMonth(year: number, month: number) {
  return new Date(year || 2000, month, 0).getDate()
}

function WheelItem({ label }: { label: string }) {
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

export function DateWheel({
  year,
  month,
  day,
  onChange,
  yearOptional = false,
}: {
  year: string
  month: string
  day: string
  onChange: (value: { year: string; month: string; day: string }) => void
  /** 생일처럼 연도 없이 월·일만 허용할 때 연도 휠에 '모름'을 추가한다 */
  yearOptional?: boolean
}) {
  const empty = !year && !month && !day

  const yearItems = yearOptional ? [UNKNOWN_YEAR, ...YEARS] : YEARS
  const maxDay = daysInMonth(Number(year), Number(month) || 1)
  const dayItems = Array.from({ length: maxDay }, (_, i) => String(i + 1))

  const pv: PickerValue = {
    year: year || (yearOptional ? UNKNOWN_YEAR : String(THIS_YEAR)),
    month: month || '1',
    day: day || '1',
  }

  const handleWheel = (next: PickerValue) => {
    const y = next.year === UNKNOWN_YEAR ? '' : String(next.year)
    const m = String(next.month)
    const max = daysInMonth(Number(y), Number(m))
    onChange({
      year: y,
      month: m,
      day: String(Math.min(Number(next.day), max)),
    })
  }

  const enable = () => {
    const now = new Date()
    onChange({
      year: yearOptional ? '' : String(THIS_YEAR),
      month: String(now.getMonth() + 1),
      day: String(now.getDate()),
    })
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-muted/40 p-1">
        <button
          type="button"
          aria-pressed={!empty}
          onClick={() => {
            if (empty) enable()
          }}
          className={cn(
            'rounded-lg px-3 py-2 text-sm transition-colors',
            !empty
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground',
          )}
        >
          날짜 입력
        </button>
        <button
          type="button"
          aria-pressed={empty}
          onClick={() => onChange({ year: '', month: '', day: '' })}
          className={cn(
            'rounded-lg px-3 py-2 text-sm transition-colors',
            empty
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground',
          )}
        >
          입력 안 함
        </button>
      </div>
      {!empty && (
        <>
          <div className="mb-1.5 flex gap-3 px-2">
            <span className="flex-1 text-center text-xs text-muted-foreground">
              연
            </span>
            <span className="flex-1 text-center text-xs text-muted-foreground">
              월
            </span>
            <span className="flex-1 text-center text-xs text-muted-foreground">
              일
            </span>
          </div>
          <Picker
            value={pv}
            onChange={handleWheel}
            height={HEIGHT}
            itemHeight={ITEM_H}
            wheelMode="natural"
            className="gap-3"
          >
            <Picker.Column name="year" className="rounded-2xl bg-muted/40">
              {yearItems.map((v) => (
                <WheelItem key={v} label={v} />
              ))}
            </Picker.Column>
            <Picker.Column name="month" className="rounded-2xl bg-muted/40">
              {MONTHS.map((v) => (
                <WheelItem key={v} label={v} />
              ))}
            </Picker.Column>
            <Picker.Column name="day" className="rounded-2xl bg-muted/40">
              {dayItems.map((v) => (
                <WheelItem key={v} label={v} />
              ))}
            </Picker.Column>
          </Picker>
        </>
      )}
    </div>
  )
}
