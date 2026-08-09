import { useEffect, useRef, useState } from 'react'
import type { PersonNode } from '@/apis/generated/mongle-api.schemas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { TagChip } from '@/components/ui/tag-chip'
import { PERSON_NODE_ATTRIBUTE } from '@/components/home/person-node-marker'
import { defaultPersonImageUrl } from '@/lib/default-person-image'
import { daysSinceDate, formatPersonName, monogram } from '@/lib/format'
import { optimizedImageUrl } from '@/lib/image-url'
import {
  formatDaysSinceLastMeet,
  formatKnownDuration,
} from '@/lib/relation-orbit-layout'

// 궤도에서 노드를 탭하면 뜨는 관계 카드. 지도를 떠나지 않고 최근 관계 요약과
// 다음 행동(기록/프로필)을 준다 — 시안 A의 '미시' 축. 만남 리듬·감정 분포는
// 데이터 출처가 없어 꾸며내지 않는다(백엔드 집계 API가 생기면 추가).
export function PersonCardSheet({
  person,
  container,
  onOpenChange,
  onRecord,
  onProfile,
}: {
  person: PersonNode | null
  /** 시트를 그릴 Main 화면 노드. body로 새면 위에 쌓인 activity까지 따라 올라온다. */
  container?: HTMLElement | null
  onOpenChange: (open: boolean) => void
  onRecord: (personId: number) => void
  onProfile: (personId: number) => void
}) {
  // 닫히는 애니메이션 동안 person이 null로 바뀌어도 카드가 먼저 사라지지 않게
  // 마지막 인물 데이터를 붙잡아 둔다.
  const [lastPerson, setLastPerson] = useState<PersonNode | null>(person)
  useEffect(() => {
    if (person) setLastPerson(person)
  }, [person])
  const shown = person ?? lastPerson

  // vaul은 modal={false}여도 Radix가 body에 건 `pointer-events: none`을 자신의
  // onOpenChange 콜백에서만 되돌린다. 이 시트는 열림 상태가 URL step에서 오는
  // 외부 제어라 그 콜백이 돌지 않아, 직접 되돌려야 뒤의 지도가 계속 눌린다.
  useEffect(() => {
    if (!person) return
    const frame = requestAnimationFrame(() => {
      document.body.style.pointerEvents = 'auto'
    })
    return () => cancelAnimationFrame(frame)
  }, [person])

  // vaul은 modal={false}일 때 바깥 pointerdown을 무조건 preventDefault 해서
  // (Content의 onPointerDownOutside) 바깥 탭 닫기가 아예 오지 않는다. 그래서
  // 직접 듣되, 다른 인물을 고르는 탭만은 '닫기'가 아니라 '내용 교체'로 넘긴다.
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange
  const isOpen = person != null
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-slot=drawer-content]')) return
      if (target.closest(`[${PERSON_NODE_ATTRIBUTE}]`)) return
      onOpenChangeRef.current(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const displayName = shown ? formatPersonName(shown) : ''
  const knownDays = shown?.firstMetDate
    ? daysSinceDate(shown.firstMetDate)
    : null
  const knownDuration = formatKnownDuration(knownDays)
  const lastMeet = formatDaysSinceLastMeet(shown?.intimacy.daysSinceLastMeet)

  return (
    // 비모달 — 시트가 떠 있어도 뒤의 지도·리스트를 그대로 만질 수 있어야
    // 다른 사람을 탭했을 때 시트가 닫혔다 열리지 않고 내용만 바뀐다.
    <Drawer
      open={person != null}
      onOpenChange={onOpenChange}
      modal={false}
      container={container}
    >
      <DrawerContent
        aria-describedby={undefined}
        overlay={false}
        // Main 화면 안에 그리므로 뷰포트 기준 fixed가 아니라 컨테이너 기준 absolute다.
        className="absolute shadow-e4"
      >
        {shown ? (
          <div className="px-5 pt-1 pb-5">
            <div className="flex items-center gap-3.5">
              <Avatar className="size-12 border border-border">
                <AvatarImage
                  src={
                    optimizedImageUrl(shown.profileImageUrl, 128) ??
                    defaultPersonImageUrl({
                      id: shown.id,
                      name: shown.name,
                      gender: shown.avatarGender ?? null,
                    })
                  }
                  alt={displayName}
                />
                <AvatarFallback>{monogram(shown.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <DrawerTitle className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em]">
                  <span data-amp-mask className="truncate">
                    {displayName}
                  </span>
                  {shown.relationTags.slice(0, 1).map((tag) => (
                    <TagChip
                      key={tag.id}
                      interactive={false}
                      size="sm"
                      color={tag.color}
                    >
                      {tag.label}
                    </TagChip>
                  ))}
                </DrawerTitle>
              </div>
            </div>

            {/* 요약 줄(알고 지낸 시간·기록 수)은 두지 않는다 — 바로 아래 3칸이
                같은 값을 더 크게 보여줘서 이름 밑에 겹쳐 읽히기만 한다. */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-secondary px-3 py-2.5">
                <span className="block text-caption text-muted-foreground">
                  마지막 만남
                </span>
                <span className="mt-1 block text-sm font-semibold tracking-[-0.01em]">
                  {lastMeet}
                </span>
              </div>
              <div className="rounded-xl bg-secondary px-3 py-2.5">
                <span className="block text-caption text-muted-foreground">
                  함께한 기록
                </span>
                <span className="mt-1 block text-sm font-semibold tracking-[-0.01em]">
                  {shown.recordCount}개
                </span>
              </div>
              <div className="rounded-xl bg-secondary px-3 py-2.5">
                <span className="block text-caption text-muted-foreground">
                  알고 지낸 시간
                </span>
                <span className="mt-1 block text-sm font-semibold tracking-[-0.01em]">
                  {knownDuration}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <Button
                size="cta"
                className="flex-1"
                onClick={() => onRecord(shown.id)}
              >
                기록 남기기
              </Button>
              <Button
                size="cta"
                variant="outline-foreground"
                className="flex-1"
                onClick={() => onProfile(shown.id)}
              >
                프로필 보기
              </Button>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
