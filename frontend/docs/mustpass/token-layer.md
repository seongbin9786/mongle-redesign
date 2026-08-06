# mustpass — 결 토큰 층 구조

> 기준: `docs/design-system-gyeol.md` §토큰 층 구조. 이 목록이 깨지면 회귀다.

## 층 계약

- [ ] primitive(`src/styles/tokens.css`)는 `--gyeol-` 접두만 쓰고, 테마와 무관한 원시 값만 둔다. `.dark` 블록이 이 파일에 생기면 회귀다.
- [ ] 시맨틱(`src/styles/semantic.css`) 토큰은 primitive를 `var()`로 참조한다. `:root`/`.dark`에 원시 값 리터럴을 직접 쓰지 않는다 (elevation·letter-paper처럼 테마 종속이라 primitive를 거칠 수 없는 값만 예외).
- [ ] light/dark 반전은 시맨틱 층의 `.dark`에서만 일어난다.
- [ ] `@theme inline`(`src/styles.css`)은 시맨틱 토큰만 소비한다. `inline`을 빼면 다크 반전이 런타임에 전파되지 않는다.

## 이름 계약

- [ ] 시맨틱 토큰 이름 변경 금지 (`--background`, `--foreground`, `--card`, `--primary`, `--border`, `--input`, `--ring`, `--warm`, `--letter-paper`, `--z-overlay`, `--radius`, `--font-sans` 등). stackflow 헤더·버튼 color-mix·토글 등이 `var()`로 직접 참조한다.
- [ ] Tailwind 유틸 이름 변경 금지 (`bg-background`, `text-muted-soft`, `shadow-e1`~`e4`, `text-caption`/`label`/`body` 등).

## 소비 계약

- [ ] 컴포넌트·스토리는 시맨틱 유틸만 쓴다. 원시 값(`--gyeol-*`)을 클래스·인라인 스타일에 직접 쓰지 않는다 (토큰 스펙시먼 스토리는 예외).
- [ ] 새 색은 primitive 추가 → 시맨틱 역할 부여 → 유틸 소비 순서로 넣는다.

## 스토리북 계약

- [ ] Foundations 스토리(`src/foundations/`)는 토큰 값을 문서에 박제하지 않고 `getComputedStyle`으로 정본에서 런타임에 읽는다.
- [ ] `.storybook/preview.tsx`의 테마 전환은 앱 ThemeProvider와 동일하게 documentElement의 `.dark` 토글 방식이다.

## 검증 계약

- [ ] `pnpm build` 무오류 통과. 산출 CSS에 primitive(`--gyeol-*`)와 시맨틱(`--background: var(--gyeol-*)`) 층이 모두 존재한다.
- [ ] `pnpm build-storybook` 무오류 통과.
