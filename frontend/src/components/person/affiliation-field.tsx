import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { ChipResponse } from '@/apis/generated/mongle-api.schemas'
import { FieldLabel } from '@/components/person/field-label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListGroupInset } from '@/components/ui/list-group-inset'
import { TagChip } from '@/components/ui/tag-chip'
import { groupAffiliations } from '@/lib/affiliation-tree'
import { isImeComposing } from '@/lib/keyboard'
import { cn } from '@/lib/utils'

/**
 * 소속 고르기 — 사람당 하나라 단일 선택이다(관계 태그와 대비되는 축).
 *
 * 루트를 고른 뒤에야 그 아래 하위 소속이 보인다. 목록을 통째로 펼치면 `학교/직장`의
 * 하위가 뒤섞여 "이 사람은 어디 사람인가"라는 한 줄 답이 흐려지기 때문.
 * 새 소속 만들기는 화면(activity)이 소유한 mutation 을 onCreate 로 받는다 — 이 컴포넌트는 순수하다.
 */
export function AffiliationField({
  affiliations,
  value,
  onChange,
  onCreate,
  creating = false,
  inset = false,
  hideLabel = false,
}: {
  affiliations: ChipResponse[]
  value: number | null
  onChange: (chipId: number | null) => void
  onCreate?: (label: string, parentId: number | null) => void
  creating?: boolean
  inset?: boolean
  hideLabel?: boolean
}) {
  const [draft, setDraft] = useState('')
  const { roots, childrenOf } = groupAffiliations(affiliations)

  const selected = affiliations.find((chip) => chip.id === value) ?? null
  const selectedRootId = selected?.parentId ?? selected?.id ?? null
  const children = selectedRootId ? childrenOf(selectedRootId) : []

  const submitDraft = () => {
    const label = draft.trim()
    if (!label || !onCreate || creating) return
    // 루트가 골라져 있으면 그 아래 하위 소속으로, 아니면 새 루트로 만든다.
    onCreate(label, selectedRootId)
    setDraft('')
  }

  const body = (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {roots.map((root) => (
          <TagChip
            key={root.id}
            tone="colored"
            surface="card"
            hover
            color={root.color}
            selected={selectedRootId === root.id}
            onClick={() => {
              // 같은 루트를 다시 누르면 해제 — 소속 없음도 유효한 상태다.
              onChange(selectedRootId === root.id ? null : root.id)
            }}
          >
            {root.label}
          </TagChip>
        ))}
        {roots.length === 0 ? (
          <p className="py-1 text-caption font-medium text-muted-foreground">
            아직 만든 소속이 없어요. 아래에서 하나 만들어 보세요.
          </p>
        ) : null}
      </div>

      {children.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
          <span className="text-caption font-medium text-muted-foreground">
            세부
          </span>
          {children.map((child) => (
            <TagChip
              key={child.id}
              size="sm"
              tone="foreground"
              surface="background"
              hover
              selected={value === child.id}
              onClick={() =>
                onChange(value === child.id ? selectedRootId : child.id)
              }
            >
              {child.label}
            </TagChip>
          ))}
        </div>
      ) : null}

      {onCreate ? (
        <div className="flex items-center gap-2 border-t border-border/60 pt-2.5">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (isImeComposing(event)) return
              if (event.key === 'Enter') {
                event.preventDefault()
                submitDraft()
              }
            }}
            maxLength={10}
            placeholder={
              selectedRootId
                ? `'${roots.find((r) => r.id === selectedRootId)?.label ?? ''}' 아래 세부 소속`
                : '새 소속 (10자 이내)'
            }
            className="h-9 border-0 bg-transparent px-0 text-label shadow-none focus-visible:ring-0"
          />
          <Button
            type="button"
            variant="outline"
            size="pill-sm"
            disabled={!draft.trim() || creating}
            onClick={submitDraft}
            className="shrink-0 border-border/60"
          >
            <Plus className="size-3.5" />
            추가
          </Button>
        </div>
      ) : null}
    </div>
  )

  return (
    <div>
      {hideLabel ? null : <FieldLabel>소속</FieldLabel>}
      {inset ? (
        <ListGroupInset className={cn('mt-2 p-3')}>{body}</ListGroupInset>
      ) : (
        <div className={cn(!hideLabel && 'mt-2')}>{body}</div>
      )}
    </div>
  )
}
