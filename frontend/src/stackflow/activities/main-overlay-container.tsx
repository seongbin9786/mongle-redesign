import { createContext, useContext } from 'react'

// Main activity 화면 안에 깔린 오버레이 전용 레이어(main-activity.tsx). 탭 안에서
// 뜨는 오버레이(관계 카드 시트 등)를 body가 아니라 이 노드로 portal하면, 위에 다른
// activity가 쌓일 때 오버레이도 함께 덮이고 모바일 폭(max-w-md)도 그대로 상속된다.
// 화면 노드가 아니라 별도 레이어를 두는 이유는 그 파일의 주석에 있다.
const MainOverlayContainerContext = createContext<HTMLElement | null>(null)

export const MainOverlayContainerProvider = MainOverlayContainerContext.Provider

export function useMainOverlayContainer() {
  return useContext(MainOverlayContainerContext)
}
