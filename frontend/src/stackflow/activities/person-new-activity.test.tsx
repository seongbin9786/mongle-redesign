import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonNewActivity } from './person-new-activity'

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ pop: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}))
// AppScreen은 stackflow 렌더 컨텍스트가 필요해 테스트에서 통껍데기로 대체한다
vi.mock('@/stackflow/components/app-screen', () => ({
  AppScreen: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
// 슬라이드 전환 중엔 이전·다음 단계가 겹쳐 떠서 쿼리가 이중 매칭된다 — 전환 없이 검증
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}))
// 소속은 더 이상 하드코딩 추천값이 아니라 사용자 칩이라, 관계 단계 검증에 쓸 칩 하나를 심는다.
// vi.mock 팩토리는 호이스팅되므로 픽스처도 vi.hoisted 로 함께 끌어올린다.
const { affiliationChip } = vi.hoisted(() => ({
  affiliationChip: {
    id: 1,
    type: 'AFFILIATION' as const,
    parentId: null,
    label: '친구',
    color: '#0EA5E9',
    personal: true,
    order: 0,
    default: false,
  },
}))
vi.mock('@/apis/generated/mongle-api', () => ({
  getChips: vi.fn(({ type }: { type: string }) =>
    Promise.resolve(type === 'AFFILIATION' ? [affiliationChip] : []),
  ),
  createPerson: vi.fn(),
}))

// ActivityComponentType은 stackflow 렌더러 전용 타입이라 JSX로 직접 못 그린다
const Activity = PersonNewActivity as unknown as React.FC<{ params: object }>

function renderActivity() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Activity params={{}} />
    </QueryClientProvider>,
  )
}

describe('PersonNewActivity', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/people/new')
  })

  it('blocks moving on until a name is entered', async () => {
    const user = userEvent.setup()
    renderActivity()

    expect(screen.getByText('누구를 남길까요?')).toBeInTheDocument()
    const next = screen.getByRole('button', { name: '다음' })
    expect(next).toBeDisabled()

    await user.type(screen.getByPlaceholderText('이름'), '성빈')
    expect(next).toBeEnabled()
  })

  it('moves through funnel steps and keeps entered values', async () => {
    const user = userEvent.setup()
    renderActivity()

    await user.type(screen.getByPlaceholderText('이름'), '성빈')
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByText('어떤 사이예요?')).toBeInTheDocument()
    // 이름 단계에는 없던 저장 아이콘이 관계 단계부터 상시 노출된다
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()

    // 소속 칩은 서버에서 오므로 도착을 기다린 뒤 고른다
    await user.click(await screen.findByRole('button', { name: '친구' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('언제부터의 인연이에요?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('조금 더 남겨볼까요?')).toBeInTheDocument()
    // 마지막 단계는 하단 CTA 없이 저장만
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull()

    // 뒤로 돌아가도 입력값이 유지된다 (popstate가 비동기라 단계 전환을 기다린다)
    await user.click(screen.getByRole('button', { name: '뒤로' }))
    await screen.findByText('언제부터의 인연이에요?')
    await user.click(screen.getByRole('button', { name: '뒤로' }))
    expect(await screen.findByRole('button', { name: '친구' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('enables the date wheel only when the user opts in', async () => {
    const user = userEvent.setup()
    renderActivity()

    await user.type(screen.getByPlaceholderText('이름'), '성빈')
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('언제부터의 인연이에요?')).toBeInTheDocument()

    // 기본은 두 날짜 모두 입력 안 함 — 휠 없음
    const enableButtons = screen.getAllByRole('button', { name: '날짜 입력' })
    expect(enableButtons).toHaveLength(2)
    expect(enableButtons[0]).toHaveAttribute('aria-pressed', 'false')

    // 처음 만난 날 입력을 켜면 연/월/일 휠이 나타난다
    await user.click(enableButtons[0])
    expect(enableButtons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('연')).toBeInTheDocument()

    // 다시 입력 안 함으로 돌리면 휠이 사라진다
    await user.click(screen.getAllByRole('button', { name: '입력 안 함' })[0])
    expect(screen.queryByText('연')).toBeNull()
  })
})
