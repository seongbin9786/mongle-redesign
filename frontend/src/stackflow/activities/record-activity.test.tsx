import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ChipResponse,
  EventResponse,
  GetChipsParams,
  PersonResponse,
} from '@/apis/generated/mongle-api.schemas'
import { CHIP_TYPES } from '@/apis/queries/chips'
import { RecordActivity } from './record-activity'

const flow = vi.hoisted(() => ({
  pop: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}))
const api = vi.hoisted(() => ({
  createEvent: vi.fn(),
  getChips: vi.fn(),
  getEvent: vi.fn(),
  getPersons: vi.fn(),
  updateEvent: vi.fn(),
}))

vi.mock('@stackflow/react', () => ({
  useFlow: () => flow,
}))
vi.mock('@/stackflow/components/app-screen', () => ({
  AppScreen: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
vi.mock('@/stackflow/use-enter-done', () => ({
  useEnterDone: () => true,
}))
vi.mock('@/apis/generated/mongle-api', () => ({
  createEvent: api.createEvent,
  getChips: api.getChips,
  getEvent: api.getEvent,
  getPersons: api.getPersons,
  updateEvent: api.updateEvent,
}))

const person: PersonResponse = {
  id: 1,
  name: '민지',
  birthday: null,
  firstMetDate: null,
  lastMetDate: null,
  profileImageUrl: null,
  gender: null,
  affiliation: null,
  recordCount: 0,
  relationTags: [],
  likes: [],
  cautions: [],
  favorite: false,
  createdAt: null,
}
const chips: ChipResponse[] = [
  {
    id: 10,
    type: 'CATEGORY',
    label: '만남',
    personal: false,
    order: 0,
    default: true,
  },
  {
    id: 20,
    type: 'EMOTION',
    label: '반가움',
    personal: false,
    order: 0,
    default: true,
  },
]
const savedEvent: EventResponse = {
  id: 100,
  title: '민지 · 만남',
  memo: null,
  occurredDate: '2026-07-12',
  occurredTime: undefined,
  category: undefined,
  weather: undefined,
  emotions: [],
  persons: [{ id: 1, name: '민지' }],
  photoUrls: [],
  createdAt: null,
}

const Activity = RecordActivity as unknown as React.FC<{
  params: { personId: string }
}>

function renderActivity() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <Activity params={{ personId: '1' }} />
    </QueryClientProvider>,
  )
}

describe('RecordActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getPersons.mockResolvedValue([person])
    api.getChips.mockImplementation(({ type }: GetChipsParams) =>
      Promise.resolve(chips.filter((chip) => chip.type === type)),
    )
  })

  it('칩 응답을 받기 전에는 기록 저장 화면을 열지 않는다', async () => {
    const resolveChips: Array<() => void> = []
    api.getChips.mockImplementation(
      ({ type }: GetChipsParams) =>
        new Promise<ChipResponse[]>((resolve) => {
          resolveChips.push(() =>
            resolve(chips.filter((chip) => chip.type === type)),
          )
        }),
    )

    renderActivity()

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull()

    // 종류가 늘 때마다 숫자를 고치지 않도록 실제 조회 목록에서 개수를 받는다
    await waitFor(() => expect(resolveChips).toHaveLength(CHIP_TYPES.length))
    resolveChips.forEach((resolve) => resolve())

    expect(await screen.findByRole('button', { name: '저장' })).toBeEnabled()
  })

  it('칩 조회 실패를 오류 상태로 보여주고 다시 요청한다', async () => {
    const user = userEvent.setup()
    api.getChips.mockRejectedValueOnce(new Error('chip request failed'))

    renderActivity()

    expect(
      await screen.findByText('기록 선택지를 불러오지 못했어요.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByRole('button', { name: '저장' })).toBeEnabled()
    // 첫 조회 1회 + 재시도 1회 = 종류 수 x 2
    expect(api.getChips).toHaveBeenCalledTimes(CHIP_TYPES.length * 2)
  })

  it('저장 실패 시 입력 화면을 유지하고 오류를 보여준다', async () => {
    const user = userEvent.setup()
    api.createEvent.mockRejectedValue(new Error('save failed'))

    renderActivity()

    await user.click(await screen.findByRole('button', { name: '반가웠다' }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '기록을 저장하지 못했어요.',
    )
    expect(screen.getByRole('button', { name: '반가웠다' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(flow.pop).not.toHaveBeenCalled()
    expect(flow.replace).not.toHaveBeenCalled()
  })

  it('저장 성공 후에만 인물 타임라인으로 이동한다', async () => {
    const user = userEvent.setup()
    api.createEvent.mockResolvedValue(savedEvent)

    renderActivity()

    await user.click(await screen.findByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(flow.replace).toHaveBeenCalledWith('Person', {
        personId: '1',
        view: 'timeline',
      })
    })
  })
})
