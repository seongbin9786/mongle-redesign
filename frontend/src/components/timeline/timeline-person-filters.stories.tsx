import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PersonResponse } from '@/apis/generated/mongle-api.schemas'
import { TimelinePersonFilters } from '@/components/timeline/timeline-person-filters'

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

const meta = {
  title: 'Timeline/PersonFilters',
  component: TimelinePersonFilters,
  tags: ['autodocs'],
  // 각 스토리는 render로 상태를 직접 관리한다. 여기 args는 필수 prop 타입만 채운다.
  args: {
    persons: PERSONS,
    selectedIds: [],
    onToggle: () => {},
  },
} satisfies Meta<typeof TimelinePersonFilters>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<number[]>([1])
    return (
      <TimelinePersonFilters
        persons={PERSONS}
        selectedIds={selected}
        onToggle={(id) => setSelected((prev) => toggle(prev, id))}
      />
    )
  },
}
