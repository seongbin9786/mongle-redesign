import type { ActivityComponentType } from '@stackflow/react'
import { useActivityParams } from '@stackflow/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { zoneMutation } from '@/apis/mutations'
import { personQuery, zoneQuery } from '@/apis/queries'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { PersonPickRow } from '@/components/person/person-pick-row'
import { ListGroup } from '@/components/ui/list-group'
import { NextBar } from '@/components/ui/next-bar'
import { ScrollBody } from '@/components/ui/scroll-body'
import { StatusMessage } from '@/components/ui/status-message'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { ActivityShell } from '@/stackflow/components/activity-shell'
import { useAppFlow } from '@/stackflow/use-app-flow'

export const ZonePersonsActivity: ActivityComponentType<'ZonePersons'> = () => {
  const { pop } = useAppFlow()
  const params = useActivityParams<'ZonePersons'>()
  const zoneId = Number(params.zoneId)
  const queryClient = useQueryClient()

  const zonesQuery = useQuery(zoneQuery.list())
  const personsQuery = useQuery(personQuery.all())
  const zone = zonesQuery.data?.find((item) => item.id === zoneId)

  // 서버 상태를 화면 상태로 한 번만 옮긴다. 고르는 동안에는 서버를 건드리지 않고,
  // 저장 한 번으로 전체를 교체한다(mustpass 06-zone: 인물 할당은 전체 교체).
  const [selected, setSelected] = useState<Set<number> | null>(null)
  const checked = selected ?? new Set(zone?.personIds ?? [])

  const saveMutation = useMutation({
    ...zoneMutation.replacePersons(),
    onSuccess: async (_, variables) => {
      void trackFeature(featureEvents.zonePersonsSaved, {
        count: variables.personIds.length,
      })
      await queryClient.invalidateQueries({ queryKey: zoneQuery.allKey })
      pop()
    },
  })

  const toggle = (personId: number) => {
    const next = new Set(checked)
    if (next.has(personId)) next.delete(personId)
    else next.add(personId)
    setSelected(next)
  }

  const persons = personsQuery.data ?? []
  const pending = zonesQuery.isPending || personsQuery.isPending

  return (
    <ActivityShell layout="fixed">
      <SettingsPageHeader
        title={zone ? `${zone.name}에 담을 사람` : '존에 담을 사람'}
        onBack={() => pop()}
      />

      {pending ? (
        <StatusMessage inset="list">불러오는 중…</StatusMessage>
      ) : zonesQuery.isError || personsQuery.isError || !zone ? (
        <StatusMessage tone="error" inset="list">
          존을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </StatusMessage>
      ) : (
        <>
          <ScrollBody pad="screen">
            <p className="mb-4 text-xs font-medium text-muted-foreground">
              고른 사람이 이 우주의 궤도에 나타나요. 한 사람을 여러 존에 담아도
              괜찮아요.
            </p>
            {persons.length === 0 ? (
              <StatusMessage inset="list">
                아직 기록한 사람이 없어요.
              </StatusMessage>
            ) : (
              <ListGroup>
                {persons.map((person, index) => (
                  <PersonPickRow
                    key={person.id}
                    person={person}
                    selected={checked.has(person.id)}
                    withDivider={index < persons.length - 1}
                    onToggle={() => toggle(person.id)}
                  />
                ))}
              </ListGroup>
            )}
            {saveMutation.isError ? (
              <p className="mt-3 text-xs font-bold text-destructive">
                저장하지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            ) : null}
          </ScrollBody>

          <NextBar
            label={
              saveMutation.isPending ? '저장하는 중…' : `${checked.size}명 담기`
            }
            disabled={saveMutation.isPending}
            onNext={() =>
              saveMutation.mutate({
                id: zoneId,
                personIds: [...checked],
              })
            }
          />
        </>
      )}
    </ActivityShell>
  )
}
