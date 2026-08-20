import { Check } from 'lucide-react'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { ListGroup } from '@/components/ui/list-group'
import { ListGroupItem } from '@/components/ui/list-group-item'
import type { Universe } from '@/lib/home-universes'
import { cn } from '@/lib/utils'

/**
 * 지금 보고 있는 우주 이름을 눌러 여는 목록 — 골라서 바로 그 우주로 간다.
 *
 * 스와이프만으로는 존이 늘어날수록 원하는 우주에 닿는 데 손이 여러 번 든다(끝에서 끝이면
 * 존 수만큼). 목록은 그 거리를 한 번으로 줄인다. 인디케이터를 없애지 않는 건, 목록이
 * "지금 어디쯤인지"까지 대신해 주지는 못하기 때문이다.
 *
 * '만들기' 장은 목록에 넣지 않는다 — 여기서 고르는 건 **볼 우주**이고,
 * 존을 만드는 일은 고르는 일과 다른 종류의 행동이다.
 */
export function UniversePickerSheet({
  universes,
  index,
  open,
  onOpenChange,
  onSelect,
}: {
  universes: Universe[]
  index: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (index: number) => void
}) {
  // 원래 자리(index)를 그대로 돌려줘야 홈이 어느 쪽에서 밀려올지 정할 수 있다.
  const entries = universes
    .map((universe, position) => ({ universe, position }))
    .filter((entry) => entry.universe.kind !== 'create')

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <DrawerTitle className="mt-1 mb-1 text-body font-semibold">
          우주 고르기
        </DrawerTitle>
        <p className="mb-4 text-xs font-medium text-muted-foreground">
          내가 이름 붙인 존으로 바로 넘어갈 수 있어요.
        </p>

        <div className="min-h-0 overflow-y-auto">
          <ListGroup>
            {entries.map((entry, position) => {
              const current = entry.position === index
              return (
                <ListGroupItem
                  key={entry.universe.id}
                  withDivider={position < entries.length - 1}
                  className="py-0"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(entry.position)}
                    aria-current={current ? 'true' : undefined}
                    className="flex w-full items-center gap-3 py-3.5 text-left active:opacity-70"
                  >
                    <span
                      className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        entry.universe.color ? '' : 'bg-muted-soft',
                      )}
                      style={
                        entry.universe.color
                          ? { backgroundColor: entry.universe.color }
                          : undefined
                      }
                    />
                    <span
                      // 존 이름은 사용자가 지은 말이라 마스킹 대상이다(analytics.ts 마스킹 계약).
                      data-amp-mask={
                        entry.universe.kind === 'zone' ? true : undefined
                      }
                      className={cn(
                        'min-w-0 flex-1 truncate text-body text-foreground',
                        current ? 'font-bold' : 'font-semibold',
                      )}
                    >
                      {entry.universe.name}
                    </span>
                    <span className="shrink-0 text-caption font-medium text-muted-foreground">
                      {entry.universe.nodes.length}명
                    </span>
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        current ? 'text-foreground' : 'text-transparent',
                      )}
                    />
                  </button>
                </ListGroupItem>
              )
            })}
          </ListGroup>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
