import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type {
  ChipResponse,
  PersonResponse,
} from '@/apis/generated/mongle-api.schemas'
import { TimelineFilterDrawer } from '@/components/timeline/timeline-filter-drawer'

const CATEGORY_CHIPS: ChipResponse[] = [
  {
    id: 1,
    type: 'CATEGORY',
    label: '만남',
    personal: false,
    order: 0,
    default: true,
  },
  {
    id: 2,
    type: 'CATEGORY',
    label: '식사',
    personal: false,
    order: 1,
    default: false,
  },
  {
    id: 3,
    type: 'CATEGORY',
    label: '여행',
    personal: true,
    order: 2,
    default: false,
  },
  {
    id: 4,
    type: 'CATEGORY',
    label: '경조사',
    personal: false,
    order: 3,
    default: false,
  },
]

const PERSONS: PersonResponse[] = [
  {
    id: 1,
    name: '엄마',
    gender: 'FEMALE',
    favorite: true,
    recordCount: 0,
    relationTags: [],
    likes: [],
    cautions: [],
  },
  {
    id: 2,
    name: '김민수',
    gender: 'MALE',
    profileImageUrl: 'https://picsum.photos/seed/minsu/200',
    favorite: false,
    recordCount: 0,
    relationTags: [],
    likes: [],
    cautions: [],
  },
  {
    id: 3,
    name: '이지은',
    gender: 'FEMALE',
    favorite: false,
    recordCount: 0,
    relationTags: [],
    likes: [],
    cautions: [],
  },
]

const toggle = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]

// TimelineFilterDrawer는 vaul Drawer를 내부에서 직접 렌더하고 defaultOpen을
// props로 노출하지 않는다. 따라서 스토리는 트리거 버튼을 그리고, 클릭하면
// 오버레이 내용이 열린다(상호작용). selected 상태를 로컬로 들고 있어 드로어
// 안의 칩 토글도 실제로 동작한다.
function DrawerHarness({
  initialCategoryIds,
  initialPersonIds,
}: {
  initialCategoryIds: number[]
  initialPersonIds: number[]
}) {
  const [categoryIds, setCategoryIds] = useState<number[]>(initialCategoryIds)
  const [personIds, setPersonIds] = useState<number[]>(initialPersonIds)
  const activeFilterCount = categoryIds.length + personIds.length

  return (
    <TimelineFilterDrawer
      categoryChips={CATEGORY_CHIPS}
      persons={PERSONS}
      selectedCategoryIds={categoryIds}
      selectedPersonIds={personIds}
      activeFilterCount={activeFilterCount}
      hasFilter={activeFilterCount > 0}
      onToggleCategory={(id) => setCategoryIds((prev) => toggle(prev, id))}
      onTogglePerson={(id) => setPersonIds((prev) => toggle(prev, id))}
      onReset={() => {
        setCategoryIds([])
        setPersonIds([])
      }}
    />
  )
}

const meta = {
  title: 'Timeline/TimelineFilterDrawer',
  component: TimelineFilterDrawer,
  tags: ['autodocs'],
  // 각 스토리는 render로 상태를 직접 관리한다. 여기 args는 필수 prop 타입만 채운다.
  args: {
    categoryChips: CATEGORY_CHIPS,
    persons: PERSONS,
    selectedCategoryIds: [],
    selectedPersonIds: [],
    activeFilterCount: 0,
    hasFilter: false,
    onToggleCategory: () => {},
    onTogglePerson: () => {},
    onReset: () => {},
  },
} satisfies Meta<typeof TimelineFilterDrawer>

export default meta

type Story = StoryObj<typeof meta>

export const NoFilter: Story = {
  render: () => <DrawerHarness initialCategoryIds={[]} initialPersonIds={[]} />,
}

export const WithActiveCount: Story = {
  render: () => (
    <DrawerHarness initialCategoryIds={[1, 2]} initialPersonIds={[1]} />
  ),
}
