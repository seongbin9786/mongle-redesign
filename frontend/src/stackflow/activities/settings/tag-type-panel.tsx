import { useMutation } from '@tanstack/react-query'
import { Check, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmPopup } from '@/components/ui/confirm-popup'
import { Input } from '@/components/ui/input'
import { ListGroupInset } from '@/components/ui/list-group-inset'
import type {
  ChipResponse,
  ChipResponseType,
} from '@/apis/generated/mongle-api.schemas'
import { chipMutation } from '@/apis/mutations'
import {
  RELATION_TAG_COLOR_PALETTE,
  normalizeChipColor,
} from '@/lib/relation-tag-colors'
import { isImeComposing } from '@/lib/keyboard'
import { RelationTagColorPicker } from '@/components/settings/relation-tag-color-picker'
import { TagSettingRow } from '@/components/settings/tag-setting-row'
import { featureEvents, trackFeature } from '@/lib/analytics'

export function TagTypePanel({
  type,
  label,
  description,
  chips,
  onChanged,
}: {
  type: ChipResponseType
  label: string
  description: string
  chips: ChipResponse[]
  onChanged: () => void
}) {
  const supportsColor = type === 'RELATION_TAG'
  const [draft, setDraft] = useState('')
  const [draftColor, setDraftColor] = useState<string>(
    () => RELATION_TAG_COLOR_PALETTE[0],
  )
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState<string>(
    () => RELATION_TAG_COLOR_PALETTE[0],
  )
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number
    label: string
  } | null>(null)

  const createMutation = useMutation({
    ...chipMutation.create(),
    onSuccess: () => {
      void trackFeature(featureEvents.tagCreated, {
        tag_type: type.toLowerCase(),
        has_color: supportsColor,
      })
      setDraft('')
      setDraftColor(
        RELATION_TAG_COLOR_PALETTE[
          chips.length % RELATION_TAG_COLOR_PALETTE.length
        ],
      )
      onChanged()
    },
  })
  const renameMutation = useMutation({
    ...chipMutation.update(),
    onSuccess: (_, variables) => {
      const previous = chips.find((chip) => chip.id === variables.id)
      void trackFeature(featureEvents.tagUpdated, {
        tag_type: type.toLowerCase(),
        label_changed: previous?.label !== variables.request.label,
        color_changed:
          supportsColor &&
          normalizeChipColor(previous?.color) !==
            normalizeChipColor(variables.request.color),
      })
      setEditingId(null)
      setEditLabel('')
      setEditColor(RELATION_TAG_COLOR_PALETTE[0])
      onChanged()
    },
  })
  const deleteMutation = useMutation({
    ...chipMutation.remove(),
    onSuccess: () => {
      void trackFeature(featureEvents.tagDeleted, {
        tag_type: type.toLowerCase(),
      })
      setDeleteTarget(null)
      onChanged()
    },
  })

  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
    setEditColor(RELATION_TAG_COLOR_PALETTE[0])
  }
  const startEdit = (chip: ChipResponse) => {
    setEditingId(chip.id)
    setEditLabel(chip.label)
    setEditColor(normalizeChipColor(supportsColor ? chip.color : null))
  }
  const saveEdit = (chipId: number) => {
    const trimmed = editLabel.trim()
    if (!trimmed || renameMutation.isPending) return
    renameMutation.mutate({
      id: chipId,
      request: {
        label: trimmed,
        color: supportsColor ? editColor : undefined,
      },
    })
  }
  const createTag = () => {
    const trimmed = draft.trim()
    if (!trimmed || createMutation.isPending) return
    createMutation.mutate({
      type,
      label: trimmed,
      color: supportsColor ? draftColor : undefined,
    })
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
            {label}
          </h2>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="shrink-0 text-caption font-semibold text-muted-foreground">
          {chips.length}개
        </span>
      </div>

      <div className="rounded-2xl bg-muted/35 p-3">
        {chips.length > 0 ? (
          <ul className="mb-3 divide-y divide-border/50">
            {chips.map((chip) => (
              <li key={chip.id} className="py-2 first:pt-0 last:pb-0">
                {editingId === chip.id ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3">
                    <div className="flex h-10 items-center gap-1 rounded-lg border border-border px-2 pl-3">
                      <Input
                        value={editLabel}
                        onChange={(event) => setEditLabel(event.target.value)}
                        onKeyDown={(event) => {
                          if (isImeComposing(event)) return
                          if (event.key === 'Enter') saveEdit(chip.id)
                          if (event.key === 'Escape') cancelEdit()
                        }}
                        maxLength={10}
                        autoFocus
                        disabled={renameMutation.isPending}
                        className="h-7 min-w-0 border-0 bg-transparent px-0 text-[14px] font-semibold shadow-none focus-visible:ring-0 md:text-[14px]"
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(chip.id)}
                        disabled={!editLabel.trim() || renameMutation.isPending}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 disabled:opacity-40"
                        aria-label="저장"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="수정 취소"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    {supportsColor ? (
                      <RelationTagColorPicker
                        value={editColor}
                        onChange={setEditColor}
                      />
                    ) : null}
                  </div>
                ) : (
                  <TagSettingRow
                    chip={chip}
                    supportsColor={supportsColor}
                    deletePending={deleteMutation.isPending}
                    onEdit={() => startEdit(chip)}
                    onDelete={() =>
                      setDeleteTarget({ id: chip.id, label: chip.label })
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            아직 등록된 태그가 없어요.
          </p>
        )}

        <ListGroupInset className="flex items-center gap-2 px-3">
          {supportsColor ? (
            <span
              className="size-6 shrink-0 rounded-full border border-background shadow-sm ring-1 ring-border"
              style={{ backgroundColor: normalizeChipColor(draftColor) }}
              aria-hidden
            />
          ) : null}
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="새 태그 이름 (10자 이내)"
            maxLength={10}
            onKeyDown={(event) => {
              if (isImeComposing(event)) return
              if (event.key === 'Enter') createTag()
            }}
            className="h-9 border-0 bg-transparent text-[14px] shadow-none focus-visible:ring-0"
          />
          <Button
            variant="outline"
            size="pill-sm"
            disabled={!draft.trim() || createMutation.isPending}
            onClick={createTag}
            className="shrink-0 border-border/60"
          >
            <Plus className="size-3.5" />
            추가
          </Button>
        </ListGroupInset>
        {supportsColor ? (
          <RelationTagColorPicker
            className="mt-2"
            value={draftColor}
            onChange={setDraftColor}
          />
        ) : null}
        {createMutation.isError || renameMutation.isError ? (
          <p className="mt-3 text-xs font-semibold text-destructive">
            태그를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}
      </div>

      <ConfirmPopup
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="태그를 삭제할까요?"
        description={
          deleteTarget
            ? `'${deleteTarget.label}' 태그를 지우면 관련된 태그 정보도 함께 삭제돼요.`
            : ''
        }
        error={
          deleteMutation.isError
            ? '태그를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.'
            : undefined
        }
        confirmLabel="삭제"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </section>
  )
}
