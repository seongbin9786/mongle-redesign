import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Universe } from '@/lib/home-universes'
import { cn } from '@/lib/utils'

// 홈에서 지금 보고 있는 우주가 어디쯤인지 알려 주는 유일한 단서.
// 스와이프는 흔적을 남기지 않는 제스처라, 이름과 점이 없으면 '전체로 돌아왔는지'를
// 알 수 없다. 화살표 버튼을 함께 두는 건 스와이프를 모르는 사람과 마우스 사용자를 위한 것이다.
//
// 이름 자체는 목록을 여는 버튼이다 — 존이 늘면 옆으로 넘겨 닿는 거리가 존 수만큼 길어진다.
// 누를 수 있다는 걸 화살표(⌄)로 말한다. 이름만으로는 눌러 볼 이유가 없다.
export function UniverseIndicator({
  universes,
  index,
  onMove,
  onOpenList,
}: {
  universes: Universe[]
  index: number
  onMove: (direction: 1 | -1) => void
  onOpenList: () => void
}) {
  // 우주가 '전체' 하나뿐이면(존 0개) 넘길 곳이 없어 인디케이터 자체를 그리지 않는다.
  if (universes.length <= 1) return null
  const current = universes[index]

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label="이전 우주"
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground disabled:opacity-25"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex min-w-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={onOpenList}
          aria-label="우주 목록 열기"
          className="flex max-w-full items-center gap-1.5 rounded-full px-1.5 text-label font-semibold text-foreground active:opacity-70"
        >
          {current.kind === 'create' ? (
            <Plus className="size-3 shrink-0" />
          ) : current.color ? (
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: current.color }}
            />
          ) : null}
          <span
            // 존 이름은 사용자가 지은 말이라 마스킹 대상이다(analytics.ts 마스킹 계약).
            data-amp-mask={current.kind === 'zone' ? true : undefined}
            className="truncate"
          >
            {current.name}
          </span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </button>
        <span className="flex items-center gap-1">
          {universes.map((universe, position) => (
            <span
              key={universe.id}
              className={cn(
                'size-1 rounded-full transition-colors',
                position === index ? 'bg-foreground' : 'bg-muted-soft',
                // 만들기 장은 우주가 아니라 안내라, 점도 테두리만 남겨 구분한다.
                universe.kind === 'create' &&
                  position !== index &&
                  'bg-transparent ring-1 ring-muted-soft',
              )}
            />
          ))}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === universes.length - 1}
        aria-label="다음 우주"
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground disabled:opacity-25"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
