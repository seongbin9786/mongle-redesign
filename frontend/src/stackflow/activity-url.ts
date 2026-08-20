import type { InferActivityParams } from '@stackflow/config'

export type AppActivityName =
  | 'Main'
  | 'Person'
  | 'PersonNew'
  | 'PeopleSearch'
  | 'PersonEdit'
  | 'EventDetail'
  | 'Record'
  | 'HomeSettings'
  | 'TagSettings'
  | 'ZoneSettings'
  | 'ZonePersons'
  | 'RelationGraph'
  | 'NotFound'

function pathParam(value: string): string {
  return encodeURIComponent(value)
}

function withSearch(
  pathname: string,
  params: Record<string, string | undefined>,
): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value)
  })
  const search = searchParams.toString()
  return search ? `${pathname}?${search}` : pathname
}

export function activityUrl<TActivityName extends AppActivityName>(
  activityName: TActivityName,
  activityParams: InferActivityParams<TActivityName>,
): string {
  switch (activityName) {
    case 'Main': {
      const { tab, personCard } = activityParams as InferActivityParams<'Main'>
      return withSearch(`/${tab}`, { personCard })
    }
    case 'Person': {
      const { personId, view } = activityParams as InferActivityParams<'Person'>
      return withSearch(`/people/${pathParam(personId)}`, {
        view: view === 'timeline' ? view : undefined,
      })
    }
    case 'PersonNew':
      return '/people/new'
    case 'PeopleSearch':
      return '/people/search'
    case 'PersonEdit': {
      const { personId } = activityParams as InferActivityParams<'PersonEdit'>
      return `/people/${pathParam(personId)}/edit`
    }
    case 'EventDetail': {
      const { eventId } = activityParams as InferActivityParams<'EventDetail'>
      return `/events/${pathParam(eventId)}`
    }
    case 'Record': {
      const { personId, eventId } =
        activityParams as InferActivityParams<'Record'>
      return withSearch('/record', { personId, eventId })
    }
    case 'HomeSettings':
      return '/settings/home'
    case 'TagSettings':
      return '/settings/tags'
    case 'ZoneSettings':
      return '/settings/zones'
    case 'ZonePersons': {
      const { zoneId } = activityParams as InferActivityParams<'ZonePersons'>
      return `/settings/zones/${pathParam(zoneId)}`
    }
    case 'RelationGraph':
      return '/relation-graph'
    case 'NotFound':
      return '/404'
  }
}
