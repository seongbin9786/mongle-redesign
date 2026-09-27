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
      <div className="relative flex h-full flex-col bg-background">
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
          {/*
            바텀시트 전용 레이어. 화면 노드에 바로 portal하지 않고 이 레이어를 거치는
            이유는 overflow-clip 하나 때문이다.

            stackflow AppScreen은 화면 본문을 `overflow-y: scroll` 레이어(paper) 안에
            그린다. 시트는 이 안에서 absolute + bottom-0으로 놓이고 아래로 translate
            되며 닫히는데, transform된 자손도 스크롤 가능 영역에 잡히므로 시트를 끄는
            동안 그 레이어가 끈 만큼 스크롤 가능해진다(844 -> 964로 관측). 터치 기기는
            그 상태에서 레이어를 실제로 스크롤해 버릴 수 있고, vaul은 조상 스크롤
            컨테이너가 맨 위(scrollTop 0)가 아니면 드래그를 아예 거부한다. 한 번
            거부되면 scrollLockTimeout 안에서 계속 갱신돼 그 제스처 내내 막힌다.
            그래서 시트가 손가락을 따라오지 않고 도로 올라오며, 모바일에서만 재현된다.

            clip은 시트가 화면 밖으로 나가는 만큼을 조상에게 넘기지 않아 이 연쇄를
            끊는다. hidden이 아니라 clip인 이유는 hidden은 스스로 스크롤 컨테이너가
            되어 같은 판정에 다시 걸리기 때문이다.
          */}
          <div
            ref={setOverlayContainer}
            className="pointer-events-none absolute inset-0 z-50 overflow-clip *:pointer-events-auto"
          />
        </MainOverlayContainerProvider>
      </div>
    </AppScreen>
  )
}
