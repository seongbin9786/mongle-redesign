import { Unlink } from 'lucide-react'
import { IntimacySlider } from '@/components/home/intimacy-slider'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { NextBar } from '@/components/ui/next-bar'
import { intimacyColor } from '@/lib/intimacy-scale'

export const RELATION_NOTE_MAX = 200

/** 편집 중인 선. 저장 전까지는 지도에 반영하지 않으므로 화면 상태를 통째로 들고 다닌다. */
export type EditingLink = {
  from: number
  to: number
  fromName: string
  toName: string
  intimacy: number
  note: string
}

// 친밀도 눈금 양 끝에만 말을 붙인다. 중간마다 이름을 붙이면(가끔 보는 사이 …) 사용자가
// 자기 감각 대신 그 낱말에 값을 맞추게 된다 — 여기서 알고 싶은 건 낱말이 아니라 위치다.
const SCALE_LABELS = ['먼 사이', '가까운 사이'] as const

/**
 * 이어진 선 하나를 여는 시트 — 친밀도(바)와 "어떻게 아는 사이인지"(한 줄)를 적는다.
 *
 * 값은 시트 안에서만 바뀌고 저장할 때 지도로 넘어간다. 끄는 동안 뒤 지도가 계속 다시
 * 그려지면, 시트에 가려 보이지도 않는 변화 때문에 저장 요청만 계속 나간다.
 */
export function RelationLinkSheet({
  link,
  onChange,
  onSave,
  onDisconnect,
  onOpenChange,
}: {
  link: EditingLink | null
  onChange: (link: EditingLink) => void
  onSave: () => void
  onDisconnect: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Drawer open={link !== null} onOpenChange={onOpenChange}>
      <DrawerContent className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <DrawerTitle
          data-amp-mask
          className="mt-1 mb-1 text-body font-semibold"
        >
          {link ? `${link.fromName} · ${link.toName}` : ''}
        </DrawerTitle>
        <p className="mb-5 text-xs font-medium text-muted-foreground">
          두 사람이 얼마나 가까운지, 어떻게 아는 사이인지 적어 두세요.
        </p>

        {link ? (
          <>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-label font-semibold text-foreground">
                친밀도
              </span>
              <span
                className="text-label font-bold"
                style={{ color: intimacyColor(link.intimacy) }}
              >
                {link.intimacy}
              </span>
            </div>
            <IntimacySlider
              value={link.intimacy}
              onChange={(intimacy) => onChange({ ...link, intimacy })}
            />
            <div className="mb-5 flex justify-between text-caption font-medium text-muted-foreground">
              {SCALE_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <label
              htmlFor="relation-link-note"
              className="mb-1 block text-label font-semibold text-foreground"
            >
              어떻게 아는 사이
            </label>
            <Input
              id="relation-link-note"
              value={link.note}
              onChange={(event) =>
                onChange({ ...link, note: event.target.value })
              }
              maxLength={RELATION_NOTE_MAX}
              placeholder="예) 대학 동아리에서 만난 사이"
              data-amp-mask
            />

            <button
              type="button"
              onClick={onDisconnect}
              className="mt-4 mb-1 flex items-center gap-1.5 text-label font-semibold text-destructive active:opacity-70"
            >
              <Unlink className="size-3.5" />
              연결 끊기
            </button>
          </>
        ) : null}

        <NextBar label="저장" onNext={onSave} />
      </DrawerContent>
    </Drawer>
  )
}
