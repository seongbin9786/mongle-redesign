import { useMutation } from '@tanstack/react-query'
import { CornerDownRight } from 'lucide-react'
import { useState } from 'react'
import type { ChipResponse } from '@/apis/generated/mongle-api.schemas'
import { chipMutation } from '@/apis/mutations'
import { RelationTagColorPicker } from '@/components/settings/relation-tag-color-picker'
import { TagCreateRow } from '@/components/settings/tag-create-row'
import { TagInlineEditor } from '@/components/settings/tag-inline-editor'
import { TagSettingRow } from '@/components/settings/tag-setting-row'
import { ConfirmPopup } from '@/components/ui/confirm-popup'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { groupAffiliations } from '@/lib/affiliation-tree'
import {
  RELATION_TAG_COLOR_PALETTE,
  normalizeChipColor,
} from '@/lib/relation-tag-colors'

/**
 * 소속 설정 — 관계 태그(TagTypePanel)와 패널을 나눈 이유는 규칙이 달라서다.
 * 소속만 계층(1단계)을 갖고, 하위는 색이 없으며, 루트를 지우면 하위도 함께 사라진다.
 * 편집·생성 줄 같은 공통 부품은 components/settings 로 내려 두 패널이 함께 쓴다.
 */
export function AffiliationPanel({
  chips,
  onChanged,
}: {
  chips: ChipResponse[]
  onChanged: () => void
}) {
  const { roots, childrenOf } = groupAffiliations(chips)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState<string>(
    () => RELATION_TAG_COLOR_PALETTE[0],
  )
  // 하위 입력창은 한 번에 하나만 연다 — 여러 줄이 동시에 열리면 어디에 붙는지 헷갈린다.
  const [childDraftFor, setChildDraftFor] = useState<number | null>(null)
  const [childDraft, setChildDraft] = useState('')
  const [rootDraft, setRootDraft] = useState('')
  const [rootDraftColor, setRootDraftColor] = useState<string>(
    () => RELATION_TAG_COLOR_PALETTE[0],
  )
  const [deleteTarget, setDeleteTarget] = useState<ChipResponse | null>(null)

  const createMutation = useMutation({
    ...chipMutation.create(),
    onSuccess: (chip) => {
      void trackFeature(featureEvents.tagCreated, {
        tag_type: 'affiliation',
        has_color: chip.parentId == null,
      })
      setRootDraft('')
      setChildDraft('')
      setChildDraftFor(null)
      setRootDraftColor(
        RELATION_TAG_COLOR_PALETTE[
          (roots.length + 1) % RELATION_TAG_COLOR_PALETTE.length
        ],
      )
      onChanged()
    },
  })

  const renameMutation = useMutation({
    ...chipMutation.update(),
    onSuccess: () => {
      void trackFeature(featureEvents.tagUpdated, { tag_type: 'affiliation' })
      cancelEdit()
      onChanged()
    },
  })

  const deleteMutation = useMutation({
    ...chipMutation.remove(),
    onSuccess: () => {
      void trackFeature(featureEvents.tagDeleted, { tag_type: 'affiliation' })
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
    setChildDraftFor(null)
    setEditingId(chip.id)
    setEditLabel(chip.label)
    setEditColor(normalizeChipColor(chip.color))
  }

  const saveEdit = (chip: ChipResponse) => {
    const label = editLabel.trim()
    if (!label || renameMutation.isPending) return
    renameMutation.mutate({
      id: chip.id,
      request: {
        label,
        // 하위 소속은 색을 갖지 않는다. parentId 를 그대로 실어 계층이 풀리지 않게 한다.
        color: chip.parentId == null ? editColor : undefined,
        parentId: chip.parentId ?? undefined,
      },
    })
  }

  const createRoot = () => {
    const label = rootDraft.trim()
    if (!label || createMutation.isPending) return
    createMutation.mutate({ type: 'AFFILIATION', label, color: rootDraftColor })
  }

  const createChild = (parentId: number) => {
    const label = childDraft.trim()
    if (!label || createMutation.isPending) return
    createMutation.mutate({ type: 'AFFILIATION', label, parentId })
  }

  const deleteTargetChildCount = deleteTarget
    ? childrenOf(deleteTarget.id).length
    : 0

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
            소속
          </h2>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            한 사람에 하나씩 붙고, 목록에서 색으로 보여요
          </p>
        </div>
        <span className="shrink-0 text-caption font-bold text-muted-foreground">
          {chips.length}개
        </span>
      </div>

      <div className="rounded-2xl bg-muted/35 p-3">
        {roots.length > 0 ? (
          <ul className="mb-3 space-y-2">
            {roots.map((root) => (
              <li
                key={root.id}
                className="rounded-xl border border-border/60 bg-background p-2.5"
              >
                {editingId === root.id ? (
                  <TagInlineEditor
                    label={editLabel}
                    onLabelChange={setEditLabel}
                    color={editColor}
                    onColorChange={setEditColor}
                    pending={renameMutation.isPending}
                    onSave={() => saveEdit(root)}
                    onCancel={cancelEdit}
                  />
                ) : (
                  <TagSettingRow
                    chip={root}
                    supportsColor
                    deletePending={deleteMutation.isPending}
                    onEdit={() => startEdit(root)}
                    onDelete={() => setDeleteTarget(root)}
                  />
                )}

                {childrenOf(root.id).length > 0 ? (
                  <ul className="mt-1.5 ml-1 space-y-1 border-l border-border/70 pl-3">
                    {childrenOf(root.id).map((child) => (
                      <li key={child.id}>
                        {editingId === child.id ? (
                          <TagInlineEditor
                            label={editLabel}
                            onLabelChange={setEditLabel}
                            pending={renameMutation.isPending}
                            onSave={() => saveEdit(child)}
                            onCancel={cancelEdit}
                          />
                        ) : (
                          <TagSettingRow
                            chip={child}
                            supportsColor={false}
                            deletePending={deleteMutation.isPending}
                            onEdit={() => startEdit(child)}
                            onDelete={() => setDeleteTarget(child)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {childDraftFor === root.id ? (
                  <TagCreateRow
                    className="mt-2"
                    value={childDraft}
                    onChange={setChildDraft}
                    onSubmit={() => createChild(root.id)}
                    placeholder={`'${root.label}' 아래 세부 소속`}
                    pending={createMutation.isPending}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setChildDraftFor(root.id)
                      setChildDraft('')
                    }}
                    className="mt-1.5 ml-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CornerDownRight className="size-3" />
                    세부 소속 추가
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            아직 등록된 소속이 없어요.
          </p>
        )}

        <TagCreateRow
          value={rootDraft}
          onChange={setRootDraft}
          onSubmit={createRoot}
          placeholder="새 소속 이름 (10자 이내)"
          swatchColor={rootDraftColor}
          pending={createMutation.isPending}
        />
        <RelationTagColorPicker
          className="mt-2"
          value={rootDraftColor}
          onChange={setRootDraftColor}
        />
        {createMutation.isError || renameMutation.isError ? (
          <p className="mt-3 text-xs font-bold text-destructive">
            소속을 변경하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}
      </div>

      <ConfirmPopup
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="소속을 삭제할까요?"
        description={
          deleteTarget
            ? deleteTargetChildCount > 0
              ? `'${deleteTarget.label}'을(를) 지우면 아래 세부 소속 ${deleteTargetChildCount}개도 함께 사라져요.`
              : `'${deleteTarget.label}' 소속을 지우면 이 소속을 쓰던 사람에서도 사라져요.`
            : ''
        }
        error={
          deleteMutation.isError
            ? '소속을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.'
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
