import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import type { ActivityComponentType } from '@stackflow/react'
import { eventQuery, personQuery } from '@/apis/queries'
import { ActivityShell } from '@/stackflow/components/activity-shell'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import { ScrollBody } from '@/components/ui/scroll-body'
import { Badge } from '@/components/ui/badge'
import { StatusMessage } from '@/components/ui/status-message'
import { EventPhotoGallery } from '@/components/events/event-photo-gallery'
import { FormPageHeader } from '@/components/layout/form-page-header'
import { formatWhen } from '@/lib/format'
import { useAppFlow } from '@/stackflow/use-app-flow'

// 어디서 push되든 뒤로가기 = pop 하나로 끝난다.
// (구 라우트의 returnTo/returnPersonId 복귀 경로 시뮬레이션을 대체)
export const EventDetailActivity: ActivityComponentType<'EventDetail'> = ({
  params,
}) => {
  const { eventId } = params
  const id = Number(eventId)
  const { push, pop } = useAppFlow()

  const eventDetailQuery = useQuery(eventQuery.byId(id, Number.isFinite(id)))

  const personsQuery = useQuery(personQuery.all())

  const personById = new Map(
    (personsQuery.data ?? []).map((person) => [person.id, person]),
  )

  if (!Number.isFinite(id)) {
    return (
      <ActivityShell>
        <StatusMessage inset="screen">잘못된 경로예요.</StatusMessage>
      </ActivityShell>
    )
  }

  if (eventDetailQuery.isPending) {
    return (
      <ActivityShell>
        <StatusMessage inset="screen">불러오는 중…</StatusMessage>
      </ActivityShell>
    )
  }

  const event = eventDetailQuery.data
  if (!event) {
    return (
      <ActivityShell>
        <FormPageHeader onBack={() => pop()} title="몽글 상세" />
        <StatusMessage inset="screen">기록을 찾을 수 없어요.</StatusMessage>
      </ActivityShell>
    )
  }

  const memo = event.memo?.trim() ?? ''

  return (
    <ActivityShell className="px-0">
      <header className="grid shrink-0 grid-cols-3 items-center px-5 py-1">
        <button
          type="button"
          onClick={() => pop()}
          className="inline-flex items-center justify-self-start text-muted-foreground"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="text-center text-base font-semibold">몽글 상세</h1>
        <button
          type="button"
          onClick={() => push('Record', { eventId: String(id) })}
          className="text-right text-body font-semibold"
        >
          수정
        </button>
      </header>

      <ScrollBody pad="screen" className="px-5">
        <div className="flex items-start gap-2">
          <h2
            data-amp-mask
            className="min-w-0 flex-1 text-[22px] leading-snug font-semibold tracking-tight"
          >
            {event.title}
          </h2>
          {event.category ? (
            <Badge
              data-amp-mask
              variant="secondary"
              className="h-7 shrink-0 rounded-full px-3 font-semibold"
            >
              {event.category.label}
            </Badge>
          ) : null}
        </div>

        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          {formatWhen(event.occurredDate, event.occurredTime)}
        </p>

        {event.persons.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.persons.map((person) => {
              const profile = personById.get(person.id)
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() =>
                    push('Person', { personId: String(person.id) })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 py-1 pr-2.5 pl-1 transition-colors hover:bg-muted"
                >
                  <MonogramAvatar
                    name={person.name}
                    imageUrl={profile?.profileImageUrl}
                    gender={profile?.gender}
                    personId={person.id}
                    favorite={profile?.favorite}
                    className="size-6"
                  />
                  <span
                    data-amp-mask
                    className="text-xs font-semibold text-foreground"
                  >
                    {person.name}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        {memo ? (
          <p
            data-amp-mask
            className="mt-4 whitespace-pre-wrap text-body leading-relaxed text-foreground"
          >
            {memo}
          </p>
        ) : null}

        {event.emotions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {event.emotions.map((emotion) => (
              <Badge key={emotion.id} data-amp-mask variant="outline">
                {emotion.label}
              </Badge>
            ))}
          </div>
        ) : null}

        {event.weather ? (
          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            날씨 · {event.weather.label}
          </p>
        ) : null}

        <EventPhotoGallery photoUrls={event.photoUrls} />
      </ScrollBody>
    </ActivityShell>
  )
}
