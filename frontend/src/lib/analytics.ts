import * as amplitude from '@amplitude/analytics-browser'
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser'

const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY

export const featureEvents = {
  onboardingCompleted: 'onboarding_completed',
  personCreated: 'person_created',
  personUpdated: 'person_updated',
  personDeleted: 'person_deleted',
  personFavoriteToggled: 'person_favorite_toggled',
  peopleSearchUsed: 'people_search_used',
  peopleSortChanged: 'people_sort_changed',
  eventCreated: 'event_created',
  eventUpdated: 'event_updated',
  profileImageUploaded: 'profile_image_uploaded',
  eventPhotoUploaded: 'event_photo_uploaded',
  homeDefaultPeriodChanged: 'home_default_period_changed',
  homeRelationTagFiltered: 'home_relation_tag_filtered',
  homePersonCardOpened: 'home_person_card_opened',
  throwbackOpened: 'throwback_opened',
  throwbackDismissed: 'throwback_dismissed',
  timelineFilterChanged: 'timeline_filter_changed',
  timelineFiltersReset: 'timeline_filters_reset',
  timelineActivityFlowSelected: 'timeline_activity_flow_selected',
  tagCreated: 'tag_created',
  tagUpdated: 'tag_updated',
  tagDeleted: 'tag_deleted',
  themeChanged: 'theme_changed',
  userDataReset: 'user_data_reset',
  homeViewed: 'home_viewed',
  timelineViewed: 'timeline_viewed',
  peopleViewed: 'people_viewed',
  settingsViewed: 'settings_viewed',
  personDetailViewed: 'person_detail_viewed',
  personTimelineViewed: 'person_timeline_viewed',
  personNewViewed: 'person_new_viewed',
  personEditViewed: 'person_edit_viewed',
  eventDetailViewed: 'event_detail_viewed',
  recordViewed: 'record_viewed',
  homeSettingsViewed: 'home_settings_viewed',
  tagSettingsViewed: 'tag_settings_viewed',
  onboardingNameViewed: 'onboarding_name_viewed',
  onboardingProfileViewed: 'onboarding_profile_viewed',
} as const

type FeatureEventName = (typeof featureEvents)[keyof typeof featureEvents]
type FeatureEventProperties = Record<string, string | number | boolean>

const featureEventByScreen: Partial<Record<string, FeatureEventName>> = {
  home: featureEvents.homeViewed,
  timeline: featureEvents.timelineViewed,
  people: featureEvents.peopleViewed,
  settings: featureEvents.settingsViewed,
  person_detail: featureEvents.personDetailViewed,
  person_timeline: featureEvents.personTimelineViewed,
  person_new: featureEvents.personNewViewed,
  person_edit: featureEvents.personEditViewed,
  event_detail: featureEvents.eventDetailViewed,
  record: featureEvents.recordViewed,
  home_settings: featureEvents.homeSettingsViewed,
  tag_settings: featureEvents.tagSettingsViewed,
  onboarding_name: featureEvents.onboardingNameViewed,
  onboarding_profile: featureEvents.onboardingProfileViewed,
}

// Autocapture 개인정보 마스킹 계약:
// - 사용자 생성 텍스트(사람 이름·기록 제목·메모·관계유형·관계태그·likes/cautions·개인 칩
//   라벨·검색어 에코)를 렌더하는 요소에는 `data-amp-mask`를 단다. SDK가 해당 서브트리
//   텍스트를 '*****'로 치환한다. 정적 제품 라벨(저장·삭제·탭 이름 등)은 남겨 클릭을 구분한다.
// - 사용자 데이터가 들어갈 수 있는 aria-label·alt·title 속성은 index.html <body>의
//   `data-amp-mask-attributes`가 전역으로 가린다(조상→자손 상속, Radix/vaul 포탈 포함).
// - 공통 칩(ChipResponse.personal === false)은 제품 어휘라 마스킹하지 않는다.
//   personal 구분이 없는 ChipRef 라벨은 항상 마스킹한다.
//
// maskTextRegex는 element text·hierarchy attr·href·page title에만 적용되고
// '[Amplitude] Page URL' 등 이벤트 속성의 URL에는 적용되지 않는다(SDK 소스 확인).
// 그래서 아래 enrichment plugin이 모든 이벤트 속성에서 동적 URL의 person/event ID를
// 한 번 더 가린다. frustration 이벤트는 maskTextRegex 옵션이 닿지 않는 별도 추출기를
// 쓰므로 이 plugin이 URL ID 마스킹의 최종 방어선이다.
const DYNAMIC_URL_ID_REGEX = /\/(people|events)\/\d+/g

function maskDynamicUrlIds(value: string) {
  return value.replace(DYNAMIC_URL_ID_REGEX, '/$1/:id')
}

function maskEventPropertyValues(value: unknown): unknown {
  if (typeof value === 'string') return maskDynamicUrlIds(value)
  if (Array.isArray(value)) return value.map(maskEventPropertyValues)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        maskEventPropertyValues(entry),
      ]),
    )
  }
  return value
}

const urlIdMaskEnrichment: amplitude.Types.EnrichmentPlugin = {
  name: 'mask-dynamic-url-ids',
  type: 'enrichment',
  execute: async (event) => {
    if (event.event_properties) {
      event.event_properties = maskEventPropertyValues(
        event.event_properties,
      ) as Record<string, unknown>
    }
    return event
  },
}

let initializationPromise: Promise<void> | null = null

export function initializeAnalytics() {
  if (!apiKey) return Promise.resolve()

  if (!initializationPromise) {
    // Analytics 초기화 전에 플러그인을 등록해야 최초 세션 이벤트에도 동일한
    // device ID와 Session Replay ID가 연결된다.
    amplitude.add(sessionReplayPlugin({ sampleRate: 1 }))
    initializationPromise = amplitude
      .init(apiKey, {
        autocapture: {
          attribution: false,
          // Stackflow 화면 조회의 source of truth는 명시적 screen_viewed 이벤트
          pageViews: false,
          sessions: true,
          // 폼 시작·제출 메타(form id/name/action)만 수집되고 입력값은 SDK가 수집하지 않는다
          formInteractions: true,
          fileDownloads: false,
          // 객체 설정도 활성화로 간주된다 (SDK isElementInteractionsEnabled)
          elementInteractions: {
            maskTextRegex: [DYNAMIC_URL_ID_REGEX],
          },
          pageUrlEnrichment: false,
          networkTracking: false,
          webVitals: false,
          frustrationInteractions: true,
        },
        remoteConfig: {
          fetchRemoteConfig: false,
        },
      })
      .promise.then(() => amplitude.add(urlIdMaskEnrichment).promise)
      .catch((error: unknown) => {
        console.error('Amplitude initialization failed.', error)
      })
  }

  return initializationPromise
}

export async function setAnalyticsUserId(userId: string) {
  if (!apiKey) return

  await initializeAnalytics()
  amplitude.setUserId(userId)
}

export async function trackScreenView(screen: string) {
  if (!apiKey) return

  await initializeAnalytics()
  amplitude.track('screen_viewed', { screen })

  const featureEvent = featureEventByScreen[screen]
  if (featureEvent) amplitude.track(featureEvent)
}

export async function trackFeature(
  eventName: FeatureEventName,
  properties?: FeatureEventProperties,
) {
  if (!apiKey) return

  await initializeAnalytics()
  try {
    await amplitude.track(eventName, properties).promise
  } catch (error) {
    console.error('Amplitude event tracking failed.', error)
  }
}

export function resetAnalytics() {
  if (!apiKey) return

  amplitude.reset()
}
