import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import {
  ACTIVITY_FLOW_PERIOD_OPTIONS,
  buildPersonActivityFlow,
} from '@/lib/timeline-activity-flow'
import type {
  ActivityFlowDotSize,
  ActivityFlowPeriod,
  ActivityFlowRecord,
  ActivityFlowSelection,
} from '@/lib/timeline-activity-flow'
import type { PersonImageGender } from '@/lib/default-person-image'
import { optimizedImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

const LANE_LABEL_WIDTH = 'w-24'
// 월 축에서 한 화면에 보여줄 최대 개월 수. 이보다 달이 많고 점이 sm 단계로
// 빽빽해지면 가로 스크롤로 전환해 6개월씩만 보여준다.
const MONTHS_VISIBLE = 6

// 점 지름 단계별 기본/선택 크기. sm 단계는 사진을 넣기엔 너무 작아 항상 민무늬 점으로 둔다.
const DOT_SIZE_CLASS: Record<ActivityFlowDotSize, string> = {
  sm: 'size-2',
  md: 'size-3',
  lg: 'size-4',
}
const DOT_SIZE_SELECTED_CLASS: Record<ActivityFlowDotSize, string> = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
}

type ActivityFlowPerson = {
  id: number
  name: string
  profileImageUrl?: string | null
  gender?: PersonImageGender
}

export function ActivityFlowChart({
  persons,
  records,
  selectedPoint,
  onSelectPoint,
}: {
  /** Y축에 표시할 등록된 사람 목록 */
  persons: ActivityFlowPerson[]
  /** 사람별 기록 날짜 */
  records: ActivityFlowRecord[]
  selectedPoint?: ActivityFlowSelection | null
  onSelectPoint?: (point: ActivityFlowSelection | null) => void
}) {
  const [period, setPeriod] = useState<ActivityFlowPeriod>('RECENT')
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const flow = useMemo(
    () => buildPersonActivityFlow(persons, records, period),
    [persons, records, period],
  )
  const personById = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
  )

  // 점이 sm 단계(사람 수·만남 빈도 과다)로 빽빽해질 때만 월 축을 가로 스크롤로 전환한다.
  const needsMonthScroll =
    !!flow &&
    flow.axisMode === 'month' &&
    flow.dotSize === 'sm' &&
    flow.axisLabels.length > MONTHS_VISIBLE

  useEffect(() => {
    if (!needsMonthScroll) return
    const el = scrollRef.current
    if (!el) return
    // 최근 달이 오른쪽 끝이므로 기본 스크롤 위치를 오른쪽으로 맞춘다.
    el.scrollLeft = el.scrollWidth
  }, [needsMonthScroll, flow])

  if (!flow) return null

  const periodLabel =
    ACTIVITY_FLOW_PERIOD_OPTIONS.find((o) => o.value === period)?.label ??
    '최근'
  const axisLabelClass = (position: number) =>
    cn(
      'absolute text-[10px] leading-none font-semibold text-muted-foreground whitespace-nowrap',
      position <= 0.02
        ? 'translate-x-0 text-left'
        : position >= 0.98
          ? '-translate-x-full text-right'
          : '-translate-x-1/2 text-center',
    )

  return (
    <div className="relative rounded-[0.4rem] bg-muted/55">
      <div className="pointer-events-none h-1 rounded-t-[0.4rem] bg-gradient-to-r from-foreground/80 via-muted-foreground/25 to-transparent" />
      <div className="p-4">
        <div className="relative mb-1 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">활동 흐름</p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-caption font-semibold text-foreground"
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
            >
              {periodLabel}
              <ChevronDown
                className={cn(
                  'size-3 text-muted-foreground transition-transform',
                  menuOpen && 'rotate-180',
                )}
              />
            </button>
            {menuOpen ? (
              <ul
                role="listbox"
                className="absolute top-full right-0 z-30 mt-1 min-w-[4.5rem] overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-md"
              >
                {ACTIVITY_FLOW_PERIOD_OPTIONS.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={period === option.value}
                      onClick={() => {
                        setPeriod(option.value)
                        setMenuOpen(false)
                        onSelectPoint?.(null)
                      }}
                      className={cn(
                        'flex w-full px-3 py-1.5 text-left text-caption font-semibold',
                        period === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted',
                      )}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {flow.quietMessage ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {flow.quietMessage}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <div className={cn(LANE_LABEL_WIDTH, 'shrink-0 space-y-1 py-1')}>
            {flow.lanes.map((lane) => {
              const person = personById.get(lane.personId)
              return (
                <div
                  key={lane.personId}
                  className="flex h-7 min-w-0 items-center gap-1.5"
                  title={lane.label}
                >
                  <MonogramAvatar
                    name={lane.label}
                    imageUrl={person?.profileImageUrl}
                    gender={person?.gender}
                    personId={lane.personId}
                    className="size-5"
                  />
                  <span
                    data-amp-mask
                    className="min-w-0 flex-1 truncate text-caption font-semibold text-muted-foreground"
                  >
                    {lane.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* 점·축 라벨 — 사람 이름 컬럼은 스크롤에서 제외해 항상 보이게 둔다 */}
          <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
            <div
              style={
                needsMonthScroll
                  ? {
                      width: `${(flow.axisLabels.length / MONTHS_VISIBLE) * 100}%`,
                    }
                  : undefined
              }
              className="min-w-full space-y-1 px-3 py-1"
            >
              {flow.lanes.map((lane, laneIndex) => (
                <div key={lane.personId} className="relative h-7">
                  <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 rounded-full bg-muted-foreground/10" />
                  {lane.points.map((point, pointIndex) => {
                    const isSelected =
                      selectedPoint?.personId === lane.personId &&
                      selectedPoint.date === point.date
                    const bloomDelayMs = Math.min(
                      laneIndex * 28 + pointIndex * 22,
                      480,
                    )
                    // sm 단계는 점이 너무 작아 사진을 생략하고 민무늬 점으로 표시한다.
                    const photoSrc =
                      flow.dotSize === 'sm'
                        ? null
                        : optimizedImageUrl(point.photoUrl, 64)
                    return (
                      <button
                        key={point.id}
                        type="button"
                        disabled={!onSelectPoint}
                        onClick={() =>
                          onSelectPoint?.(
                            isSelected
                              ? null
                              : { personId: lane.personId, date: point.date },
                          )
                        }
                        style={{
                          left: `${point.position * 100}%`,
                          animationDelay: `${bloomDelayMs}ms`,
                        }}
                        title={point.date}
                        className={cn(
                          'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full shadow-[0_0_0_4px_rgba(0,0,0,0.04)] transition-transform hover:scale-125',
                          photoSrc ? 'bg-muted' : 'bg-foreground',
                          'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:fill-mode-backwards motion-safe:duration-300 motion-safe:ease-out',
                          isSelected
                            ? DOT_SIZE_SELECTED_CLASS[flow.dotSize]
                            : DOT_SIZE_CLASS[flow.dotSize],
                          isSelected &&
                            'ring-2 ring-foreground ring-offset-2 ring-offset-card',
                        )}
                        aria-label={`${lane.label} ${point.date} 기록`}
                      >
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ))}

              <div className="relative mt-1 h-4">
                {flow.axisLabels.map((label) => (
                  <span
                    key={`${label.text}-${label.position}`}
                    style={{ left: `${label.position * 100}%` }}
                    className={axisLabelClass(label.position)}
                  >
                    {label.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
