import { useRef, useState } from 'react'
import { AppScreen } from '@/stackflow/components/app-screen'
import type { ActivityComponentType } from '@stackflow/react'
import { MainOverlayContainerProvider } from '@/stackflow/activities/main-overlay-container'
import { StackTabBar } from '@/stackflow/components/stack-tab-bar'
import { HomeTab } from '@/stackflow/tabs/home-tab'
import { TimelineTab } from '@/stackflow/tabs/timeline-tab'
import { PeopleTab } from '@/stackflow/tabs/people-tab'
import { SettingsTab } from '@/stackflow/tabs/settings-tab'
import { isMainTab, MAIN_TABS } from '@/stackflow/stackflow.config'
import type { MainTab } from '@/stackflow/stackflow.config'

const TAB_COMPONENTS: Record<MainTab, React.ComponentType> = {
  home: HomeTab,
  timeline: TimelineTab,
  people: PeopleTab,
  settings: SettingsTab,
}

// 하단 탭 4개를 품는 단일 activity. 탭 전환은 step(replaceStep)이라
// 히스토리가 쌓이지 않고, 이 컴포넌트가 언마운트되지 않아 탭 상태가 보존된다.
export const MainActivity: ActivityComponentType<'Main'> = ({ params }) => {
  const tab: MainTab = isMainTab(params.tab) ? params.tab : 'home'
  // 방문한 탭만 마운트하고, 한 번 방문한 탭은 hidden으로 유지한다.
  // (전 탭을 즉시 마운트하면 첫 진입에 모든 탭의 쿼리가 동시에 나간다)
  const visitedTabs = useRef<Set<MainTab>>(new Set())
  visitedTabs.current.add(tab)
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(
    null,
  )

  return (
    <AppScreen>
      <div
        ref={setOverlayContainer}
        className="relative flex h-full flex-col bg-background"
      >
        <MainOverlayContainerProvider value={overlayContainer}>
          {MAIN_TABS.map((t) => {
            if (!visitedTabs.current.has(t)) return null
            const Tab = TAB_COMPONENTS[t]
            return (
              <div
                key={t}
                hidden={t !== tab}
                className="relative min-h-0 flex-1"
              >
                <Tab />
              </div>
            )
          })}
          <StackTabBar activeTab={tab} />
        </MainOverlayContainerProvider>
      </div>
    </AppScreen>
  )
}
