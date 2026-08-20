import { defineConfig } from '@stackflow/config'
// ActivityDefinition에 `route` 필드를 추가하는 module augmentation을 활성화하기 위한 type-only import.
// (route는 @stackflow/config가 아니라 plugin-history-sync가 선언한다)
import type {} from '@stackflow/plugin-history-sync'
import { canPostNativeNavigation } from '@/lib/native-navigation-bridge'

export const MAIN_TABS = ['home', 'timeline', 'people', 'settings'] as const
export type MainTab = (typeof MAIN_TABS)[number]

export type PersonView = 'profile' | 'timeline'

// history-sync가 URL을 거쳐 전달하는 값은 전부 string이므로
// activity params는 string(union) 기반으로 선언한다.
declare module '@stackflow/config' {
  interface Register {
    // personCard: 홈 관계 카드 시트에 떠 있는 인물 id. 시트 열림을 URL step으로
    // 관리해 뒤로가기로 닫히고, 다른 화면에 다녀와도 유지된다.
    Main: { tab: MainTab; personCard?: string }
    Person: { personId: string; view?: PersonView }
    PersonNew: object
    PeopleSearch: object
    PersonEdit: { personId: string }
    EventDetail: { eventId: string }
    Record: { personId?: string; eventId?: string }
    HomeSettings: object
    TagSettings: object
    ZoneSettings: object
    ZonePersons: { zoneId: string }
    RelationGraph: object
    NotFound: object
    // 온보딩 퍼널(인증 전 전용 스택, onboarding/onboarding-flow.tsx)의 activity.
    // Register는 전역 하나라 여기 함께 선언한다.
    OnboardingName: object
    OnboardingProfile: object
  }
}

export function isMainTab(value: string | undefined): value is MainTab {
  return MAIN_TABS.includes(value as MainTab)
}

function appDefaultHistory<TEntry>(entries: TEntry[]): TEntry[] {
  return canPostNativeNavigation() ? [] : entries
}

// URL 생성(fill)은 해당 activity의 가장 구체적인 라우트 하나만 쓰므로
// activity당 라우트는 1개로 유지한다. 인바운드 별칭은 Stackflow 초기화 전에
// normalize-stack-url.ts에서 canonical URL로 교체한다.
export const stackConfig = defineConfig({
  activities: [
    {
      name: 'Main',
      route: {
        // `/timeline`·`/people`·`/settings` 기존 URL이 그대로 탭 딥링크가 된다
        path: '/:tab',
        // 알 수 없는 탭 세그먼트는 홈으로 흡수한다 (decode throw 시 폴백 동작이 보장되지 않음)
        // decode 반환값이 곧 activity params라, 쿼리로 온 값(personCard 등)까지
        // 함께 넘겨야 `/home?personCard=1` 딥링크가 살아난다.
        decode: (params) => ({
          ...params,
          tab: isMainTab(params.tab) ? params.tab : 'home',
        }),
      },
    },
    {
      name: 'Person',
      route: {
        path: '/people/:personId',
        // 딥링크로 바로 진입해도 뒤로가기가 앱 이탈이 아니라 탭 화면으로 떨어지게 한다
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'people' } },
          ]),
      },
    },
    {
      name: 'PersonNew',
      route: {
        path: '/people/new',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'people' } },
          ]),
      },
    },
    {
      name: 'PeopleSearch',
      route: {
        path: '/people/search',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'people' } },
          ]),
      },
    },
    {
      name: 'PersonEdit',
      route: {
        path: '/people/:personId/edit',
        defaultHistory: (params) =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'people' } },
            {
              activityName: 'Person',
              activityParams: { personId: params.personId },
            },
          ]),
      },
    },
    {
      name: 'EventDetail',
      route: {
        path: '/events/:eventId',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'timeline' } },
          ]),
      },
    },
    {
      name: 'Record',
      route: {
        path: '/record',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'home' } },
          ]),
      },
    },
    {
      name: 'HomeSettings',
      route: {
        path: '/settings/home',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'settings' } },
          ]),
      },
    },
    {
      name: 'TagSettings',
      route: {
        path: '/settings/tags',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'settings' } },
          ]),
      },
    },
    {
      name: 'ZoneSettings',
      route: {
        path: '/settings/zones',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'settings' } },
          ]),
      },
    },
    {
      name: 'ZonePersons',
      route: {
        path: '/settings/zones/:zoneId',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'settings' } },
            { activityName: 'ZoneSettings', activityParams: {} },
          ]),
      },
    },
    {
      name: 'RelationGraph',
      route: {
        path: '/relation-graph',
        defaultHistory: () =>
          appDefaultHistory([
            { activityName: 'Main', activityParams: { tab: 'home' } },
          ]),
      },
    },
    {
      name: 'NotFound',
      route: '/404',
    },
  ],
  transitionDuration: 270,
})
