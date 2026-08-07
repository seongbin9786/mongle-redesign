import { useQuery } from '@tanstack/react-query'
import { useAppFlow } from '@/stackflow/use-app-flow'
import { ChevronRight } from 'lucide-react'
import type { EventResponse } from '@/apis/generated/mongle-api.schemas'
import { eventQuery, personQuery } from '@/apis/queries'
import { DeletePersonConfirm } from '@/components/person/delete-person-confirm'
import { usePersonDelete } from '@/components/person/use-person-delete'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import { ScrollBody } from '@/components/ui/scroll-body'
import { ListGroup } from '@/components/ui/list-group'
import { ListGroupItem } from '@/components/ui/list-group-item'
import { ListGroupLabel } from '@/components/ui/list-group-label'
import { NavigationRow } from '@/components/ui/navigation-row'
import { StatusMessage } from '@/components/ui/status-message'
import { TagChip } from '@/components/ui/tag-chip'
import { optimizedImageUrl } from '@/lib/image-url'
import {
  formatAbsoluteDate,
  formatBirthday,
  formatDaysSinceFirstMet,
  formatPersonName,
} from '@/lib/format'
import type { PersonView } from '@/stackflow/stackflow.config'

export function PersonProfileView({
  personId,
  onSelectView,
}: {
  personId: string
  onSelectView: (view: PersonView) => void
}) {
  const id = Number(personId)
  const { push } = useAppFlow()
  const del = usePersonDelete(id)

  const personDetailQuery = useQuery(personQuery.byId(id))

  const recentQuery = useQuery(eventQuery.byPerson(id))

  const person = personDetailQuery.data
  const recentEvents = (recentQuery.data ?? []).slice(0, 3)

  if (!Number.isFinite(id) || personDetailQuery.isPending) {
    return (
      <StatusMessage inset="screen">
        {personDetailQuery.isPending ? '불러오는 중…' : '잘못된 경로예요.'}
      </StatusMessage>
    )
  }

  if (!person) {
    return (
      <StatusMessage inset="screen">
        사람 정보를 불러오지 못했어요.
      </StatusMessage>
    )
  }

  const birthdayLabel = formatBirthday(person.birthday ?? null)
  const displayName = formatPersonName(person)
  const infoRows = [
    birthdayLabel ? { label: '생일', value: birthdayLabel } : null,
    person.firstMetDate
      ? {
          label: '처음 만난 날',
          value: [
            formatAbsoluteDate(person.firstMetDate),
            formatDaysSinceFirstMet(person.stats.daysSinceFirstMet),
          ]
            .filter(Boolean)
            .join(' · '),
        }
      : null,
    person.lastMetDate
      ? {
          label: '마지막 만남',
          value: `${formatAbsoluteDate(person.lastMetDate)} · ${person.stats.lastMetRelative ?? '—'}`,
        }
      : null,
  ].filter((row): row is { label: string; value: string } => row !== null)

  return (
    <>
      <ScrollBody pad="tabbar" className="space-y-6">
        <section>
          <ListGroup>
            <ListGroupItem withDivider={false} className="py-4">
              <div className="flex items-start gap-4">
                <MonogramAvatar
                  name={person.name}
                  imageUrl={person.profileImageUrl}
                  gender={person.gender}
                  personId={person.id}
                  favorite={person.favorite}
                  favoriteBadge="prominent"
                  className="size-20"
                />
                <div className="min-w-0 flex-1">
                  <h1
                    data-amp-mask
                    className="truncate text-2xl font-semibold tracking-tight"
                  >
                    {displayName}
                  </h1>
                  {person.relationType ? (
                    <p
                      data-amp-mask
                      className="mt-2 text-sm font-semibold text-foreground"
                    >
                      {person.relationType}
                    </p>
                  ) : null}
                  {person.relationTags.length > 0 ? (
                    <div data-amp-mask className="mt-2 flex flex-wrap gap-1.5">
                      {person.relationTags.map((tag) => (
                        <TagChip
                          key={tag.id}
                          interactive={false}
                          surface="soft"
                          color={tag.color}
                          className="px-3 text-xs"
                        >
                          {tag.label}
                        </TagChip>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </ListGroupItem>
          </ListGroup>
        </section>

        {infoRows.length > 0 ? (
          <section>
            <ListGroupLabel>기본 정보</ListGroupLabel>
            <ListGroup>
              {infoRows.map((row, index) => (
                <InfoRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  withDivider={index < infoRows.length - 1}
                />
              ))}
            </ListGroup>
          </section>
        ) : null}

        <section>
          <ListGroupLabel>관계 요약</ListGroupLabel>
          <ListGroup>
            <ListGroupItem withDivider={false}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Stat label="만난 횟수" value={`${person.stats.meetCount}회`} />
                <Stat
                  label="새긴 기록"
                  value={`${person.stats.recordCount}개`}
                />
                <Stat
                  label="알고 지낸 시간"
                  value={person.stats.acquaintancePeriod ?? '—'}
                />
                <Stat
                  label="마지막 만남"
                  value={person.stats.lastMetRelative ?? '기록 없음'}
                />
              </dl>
            </ListGroupItem>
          </ListGroup>
        </section>

        {recentEvents.length > 0 ? (
          <section>
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
                최근 함께한 일
              </p>
              <button
                type="button"
                onClick={() => onSelectView('timeline')}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="최근 함께한 일 전체 보기"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <ListGroup>
              {recentEvents.map((event, index) => (
                <ListGroupItem
                  key={event.id}
                  withDivider={index < recentEvents.length - 1}
                  className="py-3"
                >
                  <RecentEventRow event={event} />
                </ListGroupItem>
              ))}
            </ListGroup>
          </section>
        ) : null}

        {person.likes.length > 0 || person.cautions.length > 0 ? (
          <section>
            <ListGroupLabel>취향</ListGroupLabel>
            <ListGroup>
              {person.likes.length > 0 ? (
                <ListGroupItem withDivider={person.cautions.length > 0}>
                  <PreferenceBlock
                    label="좋아하는 것"
                    value={person.likes.join(' · ')}
                  />
                </ListGroupItem>
              ) : null}
              {person.cautions.length > 0 ? (
                <ListGroupItem withDivider={false}>
                  <PreferenceBlock
                    label="조심할 것"
                    value={person.cautions.join(' · ')}
                  />
                </ListGroupItem>
              ) : null}
            </ListGroup>
          </section>
        ) : null}

        <section>
          <ListGroupLabel>작업</ListGroupLabel>
          <ListGroup>
            <NavigationRow
              label="상황 기록 작성"
              onClick={() => push('Record', { personId })}
            />
            <NavigationRow
              label="프로필 수정"
              onClick={() => push('PersonEdit', { personId })}
            />
            <NavigationRow
              label="인물 삭제"
              tone="destructive"
              withDivider={false}
              disabled={del.pending}
              onClick={() => del.setOpen(true)}
            />
          </ListGroup>
        </section>
      </ScrollBody>

      <DeletePersonConfirm
        open={del.open}
        onOpenChange={del.setOpen}
        error={del.error}
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </>
  )
}

function RecentEventRow({ event }: { event: EventResponse }) {
  const photoSrc = optimizedImageUrl(event.photoUrls[0], 128)
  const summary = event.memo

  const { push } = useAppFlow()

  return (
    <button
      type="button"
      onClick={() => push('EventDetail', { eventId: String(event.id) })}
      className="flex w-full min-w-0 items-center gap-3 text-left transition-colors active:opacity-70"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p data-amp-mask className="truncate text-sm font-semibold">
            {event.title}
          </p>
          {event.category ? (
            <TagChip data-amp-mask interactive={false} size="sm" surface="soft">
              {event.category.label}
            </TagChip>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
          {formatAbsoluteDate(event.occurredDate)}
        </p>
        {summary ? (
          <p
            data-amp-mask
            className="mt-1 line-clamp-1 text-xs text-foreground/80"
          >
            {summary}
          </p>
        ) : null}
      </div>
      {photoSrc ? (
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
          <img
            src={photoSrc}
            alt="최근 기록 사진"
            className="size-full object-cover"
            loading="lazy"
          />
          {event.photoUrls.length > 1 ? (
            <span className="absolute right-1 bottom-1 rounded-full bg-foreground/80 px-1 py-0.5 text-[9px] font-semibold text-background">
              +{event.photoUrls.length - 1}
            </span>
          ) : null}
        </div>
      ) : null}
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}

function PreferenceBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p data-amp-mask className="mt-1 text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  )
}

function InfoRow({
  label,
  value,
  withDivider,
}: {
  label: string
  value: string
  withDivider: boolean
}) {
  return (
    <ListGroupItem withDivider={withDivider}>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </ListGroupItem>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-body font-semibold text-foreground">{value}</dd>
    </div>
  )
}
