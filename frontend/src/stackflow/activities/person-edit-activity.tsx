import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityComponentType } from '@stackflow/react'
import { ActivityShell } from '@/stackflow/components/activity-shell'
import { FormPageHeader } from '@/components/layout/form-page-header'
import { DeletePersonConfirm } from '@/components/person/delete-person-confirm'
import { PersonEditForm } from '@/components/person/person-edit-form'
import { personToFormValues } from '@/components/person/person-form'
import { usePersonDelete } from '@/components/person/use-person-delete'
import { Button } from '@/components/ui/button'
import { ScrollBody } from '@/components/ui/scroll-body'
import { StatusMessage } from '@/components/ui/status-message'
import { chipMutation, personMutation } from '@/apis/mutations'
import { chipQuery, homeQuery, personQuery } from '@/apis/queries'
import { useEnterDone } from '@/stackflow/use-enter-done'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { useAppFlow } from '@/stackflow/use-app-flow'

const PERSON_FORM_ID = 'person-form'

export const PersonEditActivity: ActivityComponentType<'PersonEdit'> = ({
  params,
}) => {
  const { personId } = params
  const id = Number(personId)
  const { pop } = useAppFlow()
  const enterDone = useEnterDone()
  const queryClient = useQueryClient()
  const del = usePersonDelete(id, { popCount: 2 })

  const personDetailQuery = useQuery(personQuery.byId(id))

  const chipsQuery = useQuery(chipQuery.all())

  const person = personDetailQuery.data
  const relationTags =
    chipsQuery.data?.filter((c) => c.type === 'RELATION_TAG') ?? []
  const affiliations =
    chipsQuery.data?.filter((c) => c.type === 'AFFILIATION') ?? []

  // 수정 중에도 없는 소속을 바로 만들 수 있게 한다(등록 화면과 같은 규칙).
  // 폼은 initialValues 로만 초기화되므로 만든 소속의 선택은 폼이 스스로 이어받는다.
  const affiliationMutation = useMutation({
    ...chipMutation.create(),
    onSuccess: async () => {
      void trackFeature(featureEvents.tagCreated, {
        tag_type: 'affiliation',
      })
      await queryClient.invalidateQueries({ queryKey: chipQuery.allKey })
    },
  })

  const updateMutation = useMutation({
    ...personMutation.update(id),
    onSuccess: async () => {
      void trackFeature(featureEvents.personUpdated)
      await queryClient.invalidateQueries({
        queryKey: personQuery.byId(id).queryKey,
      })
      await queryClient.invalidateQueries({ queryKey: personQuery.allKey })
      await queryClient.invalidateQueries({ queryKey: homeQuery.allKey })
      pop()
    },
  })

  const handleDelete = () => {
    del.setOpen(true)
  }

  // 폼 마운트가 무거워 enter 전환 중에는 로딩 셸만 둔다 (use-enter-done.ts)
  if (!Number.isFinite(id) || !enterDone || personDetailQuery.isPending) {
    return (
      <ActivityShell layout="fixed">
        <StatusMessage inset="screen">
          {Number.isFinite(id) ? '불러오는 중…' : '잘못된 경로예요.'}
        </StatusMessage>
      </ActivityShell>
    )
  }

  if (!person || personDetailQuery.isError) {
    return (
      <ActivityShell layout="fixed">
        <StatusMessage tone="error" inset="screen">
          사람 정보를 불러오지 못했어요.
        </StatusMessage>
      </ActivityShell>
    )
  }

  const initialValues = personToFormValues({
    ...person,
    relationTagChipIds: person.relationTags.map((t) => t.id),
    firstMetDate: person.firstMetDate ?? undefined,
    lastMetDate: person.lastMetDate ?? undefined,
  })

  return (
    <ActivityShell layout="fixed" className="px-0">
      <FormPageHeader
        onBack={() => pop()}
        title="프로필 수정"
        className="px-5"
      />

      <ScrollBody pad="none">
        <div className="px-5 pt-4">
          <PersonEditForm
            key={person.id}
            formId={PERSON_FORM_ID}
            initialValues={initialValues}
            relationTags={relationTags}
            affiliations={affiliations}
            onCreateAffiliation={(label, parentId) =>
              affiliationMutation.mutate({
                type: 'AFFILIATION',
                label,
                parentId: parentId ?? undefined,
              })
            }
            creatingAffiliation={affiliationMutation.isPending}
            pending={updateMutation.isPending || del.pending}
            onSubmit={(request) => updateMutation.mutate(request)}
            onDelete={handleDelete}
          />

          {updateMutation.isError ? (
            <p className="mt-4 text-center text-xs text-destructive">
              저장에 실패했어요. 잠시 후 다시 시도해 주세요.
            </p>
          ) : null}
        </div>
      </ScrollBody>

      <div className="shrink-0 border-t border-border/70 bg-background px-5 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          form={PERSON_FORM_ID}
          size="lg"
          className="h-12 w-full text-base font-semibold"
          disabled={updateMutation.isPending || del.pending}
        >
          {updateMutation.isPending ? '저장 중…' : '변경사항 저장'}
        </Button>
      </div>

      <DeletePersonConfirm
        open={del.open}
        onOpenChange={del.setOpen}
        error={del.error}
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </ActivityShell>
  )
}
