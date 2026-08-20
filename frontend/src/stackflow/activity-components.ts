import { MainActivity } from '@/stackflow/activities/main-activity'
import { PersonActivity } from '@/stackflow/activities/person-activity'
import { PersonNewActivity } from '@/stackflow/activities/person-new-activity'
import { PeopleSearchActivity } from '@/stackflow/activities/people-search-activity'
import { PersonEditActivity } from '@/stackflow/activities/person-edit-activity'
import { EventDetailActivity } from '@/stackflow/activities/event-detail-activity'
import { RecordActivity } from '@/stackflow/activities/record-activity'
import { HomeSettingsActivity } from '@/stackflow/activities/settings/home-settings-activity'
import { TagSettingsActivity } from '@/stackflow/activities/settings/tag-settings-activity'
import { ZoneSettingsActivity } from '@/stackflow/activities/settings/zone-settings-activity'
import { ZonePersonsActivity } from '@/stackflow/activities/settings/zone-persons-activity'
import { RelationGraphActivity } from '@/stackflow/activities/relation-graph-activity'
import { NotFoundActivity } from '@/stackflow/activities/not-found-activity'
import { OnboardingNameActivity } from '@/stackflow/onboarding/onboarding-name-activity'
import { OnboardingProfileActivity } from '@/stackflow/onboarding/onboarding-profile-activity'

// stackflow()의 components 타입이 Register 전체 키를 요구하므로,
// 앱 스택·온보딩 스택(인스턴스 2개)이 이 맵 하나를 공유한다.
// 각 스택이 실제로 렌더하는 activity는 자기 config의 activities로 한정된다.
export const activityComponents = {
  Main: MainActivity,
  Person: PersonActivity,
  PersonNew: PersonNewActivity,
  PeopleSearch: PeopleSearchActivity,
  PersonEdit: PersonEditActivity,
  EventDetail: EventDetailActivity,
  Record: RecordActivity,
  HomeSettings: HomeSettingsActivity,
  TagSettings: TagSettingsActivity,
  ZoneSettings: ZoneSettingsActivity,
  ZonePersons: ZonePersonsActivity,
  RelationGraph: RelationGraphActivity,
  NotFound: NotFoundActivity,
  OnboardingName: OnboardingNameActivity,
  OnboardingProfile: OnboardingProfileActivity,
}
