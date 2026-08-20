import type { ActivityComponentType } from '@stackflow/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ZoneResponse } from '@/apis/generated/mongle-api.schemas'
import { zoneMutation } from '@/apis/mutations'
import { zoneQuery } from '@/apis/queries'
import { RelationTagColorPicker } from '@/components/settings/relation-tag-color-picker'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { TagCreateRow } from '@/components/settings/tag-create-row'
import { TagInlineEditor } from '@/components/settings/tag-inline-editor'
import { ZoneSettingRow } from '@/components/settings/zone-setting-row'
import { ConfirmPopup } from '@/components/ui/confirm-popup'
import { ScrollBody } from '@/components/ui/scroll-body'
import { StatusMessage } from '@/components/ui/status-message'
import { featureEvents, trackFeature } from '@/lib/analytics'
import {
  RELATION_TAG_COLOR_PALETTE,
  normalizeChipColor,
} from '@/lib/relation-tag-colors'
import { ActivityShell } from '@/stackflow/components/activity-shell'
import { useAppFlow } from '@/stackflow/use-app-flow'

// 존은 홈 우주의 데이터 축이라, 여기서 바뀌면 홈 지도도 다시 나눠야 한다.
// (관계 지도 자체는 그대로지만 우주 구성이 바뀐다 → zones 쿼리만 무효화하면 된다.)
export const ZoneSettingsActivity: ActivityComponentType<
  'ZoneSettings'
> = () => {
  const { pop, push } = useAppFlow()
  const queryClient = useQueryClient()
  const zonesQuery = useQuery(zoneQuery.list())
  const zones = zonesQuery.data ?? []

  const [draft, setDraft] = useState('')
  const [draftColor, setDraftColor] = useState<string>(
    () => RELATION_TAG_COLOR_PALETTE[0],
  )
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string>(
    () => RELATION_TAG_COLOR_PALETTE[0],
  )
  const [deleteTarget, setDeleteTarget] = useState<ZoneResponse | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: zoneQuery.allKey })

  const createMutation = useMutation({
    ...zoneMutation.create(),
    onSuccess: () => {
      void trackFeature(featureEvents.zoneCreated)
      setDraft('')
      setDraftColor(
        RELATION_TAG_COLOR_PALETTE[
          (zones.length + 1) % RELATION_TAG_COLOR_PALETTE.length
        ],
      )
      void invalidate()
    },
  })
  const updateMutation = useMutation({
    ...zoneMutation.update(),
    onSuccess: () => {
      void trackFeature(featureEvents.zoneUpdated)
      setEditingId(null)
      void invalidate()
    },
  })
  const deleteMutation = useMutation({
    ...zoneMutation.remove(),
    onSuccess: () => {
      void trackFeature(featureEvents.zoneDeleted)
      setDeleteTarget(null)
      void invalidate()
    },
  })

  const createZone = () => {
    const name = draft.trim()
    if (!name || createMutation.isPending) return
    createMutation.mutate({ name, color: draftColor })
  }
  const saveEdit = (zoneId: number) => {
    const name = editName.trim()
    if (!name || updateMutation.isPending) return
    updateMutation.mutate({ id: zoneId, request: { name, color: editColor } })
  }

  return (
    <ActivityShell layout="fixed">
      <SettingsPageHeader title="존 관리(demo)" onBack={() => pop()} />
      <ScrollBody pad="screen">
        <p className="mb-1 text-body font-semibold text-foreground">
          내가 이름 붙인 우주
        </p>
        <p className="mb-4 text-xs font-medium text-muted-foreground">
          홈에서 좌우로 넘기면 존마다 다른 우주가 열려요. 최대 12개까지 만들 수
          있어요.
        </p>

        {zonesQuery.isPending ? (
          <StatusMessage inset="list">존을 불러오는 중…</StatusMessage>
        ) : zonesQuery.isError ? (
          <StatusMessage tone="error" inset="list">
            존을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </StatusMessage>
        ) : (
          <div className="rounded-2xl bg-muted/35 p-3">
            {zones.length > 0 ? (
              <ul className="mb-3 divide-y divide-border/50">
                {zones.map((zone) => (
                  <li key={zone.id} className="py-2 first:pt-0 last:pb-0">
                    {editingId === zone.id ? (
                      <TagInlineEditor
                        label={editName}
                        onLabelChange={setEditName}
                        color={editColor}
                        onColorChange={setEditColor}
                        pending={updateMutation.isPending}
                        onSave={() => saveEdit(zone.id)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <ZoneSettingRow
                        zone={zone}
                        deletePending={deleteMutation.isPending}
                        onOpen={() =>
                          push('ZonePersons', { zoneId: String(zone.id) })
                        }
                        onEdit={() => {
                          setEditingId(zone.id)
                          setEditName(zone.name)
                          setEditColor(normalizeChipColor(zone.color))
                        }}
                        onDelete={() => setDeleteTarget(zone)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                아직 만든 존이 없어요. 마음의 거리대로 이름을 붙여보세요.
              </p>
            )}

            <TagCreateRow
              value={draft}
              onChange={setDraft}
              onSubmit={createZone}
              placeholder="새 존 이름 (10자 이내)"
              swatchColor={draftColor}
              pending={createMutation.isPending}
            />
            <RelationTagColorPicker
              className="mt-2"
              value={draftColor}
              onChange={setDraftColor}
            />
            {createMutation.isError || updateMutation.isError ? (
              <p className="mt-3 text-xs font-bold text-destructive">
                존을 저장하지 못했어요. 이름이 겹치지 않는지 확인해 주세요.
              </p>
            ) : null}
          </div>
        )}
      </ScrollBody>

      <ConfirmPopup
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="존을 삭제할까요?"
        description={
          deleteTarget
            ? `'${deleteTarget.name}' 우주가 홈에서 사라져요. 담겨 있던 사람은 지워지지 않아요.`
            : ''
        }
        error={
          deleteMutation.isError
            ? '존을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.'
            : undefined
        }
        confirmLabel="삭제"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </ActivityShell>
  )
}
