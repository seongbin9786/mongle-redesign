import { isMainTab } from '@/stackflow/stackflow.config'

const SCREEN_BY_ACTIVITY = {
  PersonNew: 'person_new',
  PeopleSearch: 'people_search',
  PersonEdit: 'person_edit',
  EventDetail: 'event_detail',
  Record: 'record',
  HomeSettings: 'home_settings',
  TagSettings: 'tag_settings',
  NotFound: 'not_found',
  OnboardingName: 'onboarding_name',
  OnboardingProfile: 'onboarding_profile',
} as const

export function resolveAnalyticsScreen(
  activityName: string,
  params: Record<string, string | undefined>,
): string | undefined {
  if (activityName === 'Main') {
    return isMainTab(params.tab) ? params.tab : 'home'
  }

  if (activityName === 'Person') {
    return params.view === 'timeline' ? 'person_timeline' : 'person_detail'
  }

  return SCREEN_BY_ACTIVITY[activityName as keyof typeof SCREEN_BY_ACTIVITY]
}
