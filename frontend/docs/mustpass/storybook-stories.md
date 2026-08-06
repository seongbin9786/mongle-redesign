# mustpass — Storybook 스토리 커버리지

> 기준: 기존 `src/components/ui/button.stories.tsx` 컨벤션. 이 목록이 깨지면 회귀다.

## 파일/컨벤션 계약

- [ ] 각 컴포넌트 옆에 `<basename>.stories.tsx` 생성. **컴포넌트 원본은 수정 금지** (스토리만 추가).
- [ ] `import type { Meta, StoryObj } from '@storybook/react-vite'` + `satisfies Meta<typeof X>` + `type Story = StoryObj<typeof meta>` 패턴 준수.
- [ ] `tags: ['autodocs']` 필수.
- [ ] title 계층은 폴더 기준 PascalCase: `Foundations/*`, `UI/*`, `Brand/*`, `Auth/*`, `Events/*`, `Form/*`, `Home/*`, `Layout/*`, `Person/*`, `Record/*`, `Settings/*`, `Timeline/*`. `Foundations/*`는 토큰 스펙시먼·디자인 시스템 안내(`src/foundations/`) 전용이다.
- [ ] props/variant는 **실제 시그니처에서 도출**(추측 금지). 사용자 노출 텍스트는 한국어 샘플.

## 렌더 계약

- [ ] controlled 컴포넌트(`value`/`onChange`, `onValueChange`, `selected` 등)는 `render` + `useState` 래퍼로 상호작용 가능하게 만든다.
- [ ] `#stack-overlay-root` 포탈 대상(`confirm-popup`)은 데코레이터로 DOM에 주입한다(`confirm-popup.test.tsx` 패턴 참조: 마운트 시 `document.body`에 `#stack-overlay-root` 추가).
- [ ] 사이드이펙트 콜백(`onSubmit`, `trackFeature`, `uploadImage`)은 noop으로 주입. **마운트만으로 실제 API를 호출하면 안 된다**(상호작용 시에만 발화하는 건 허용).

## 빌드/검증 계약

- [ ] `pnpm build-storybook` (Node 22) 무오류 통과 = 모든 스토리가 컴파일·인덱싱된다.
- [ ] eslint `storybook/flat/recommended` 위반 없음.

## 범위 제외 (이번 회차 대상 아님)

- [ ] 시각 변화가 없거나 부모 레이아웃 없이는 무의미: `ui/label`, `ui/step-slide.ts`, `ui/tag-chip.ts`, `timeline/timeline-scroll-shell`.
- [ ] `ui/button`은 이미 스토리 보유.
