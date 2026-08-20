import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PersonNode } from '@/apis/generated/mongle-api.schemas'
import { UniversePickerSheet } from '@/components/home/universe-picker-sheet'
import type { Universe } from '@/lib/home-universes'

const nodes = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
  })) as PersonNode[]

const universes: Universe[] = [
  {
    id: 'all',
    kind: 'all',
    name: '전체',
    color: null,
    zoneId: null,
    nodes: nodes(24),
  },
  {
    id: 'zone:1',
    kind: 'zone',
    name: '최애존',
    color: '#E06A2B',
    zoneId: 1,
    nodes: nodes(5),
  },
  {
    id: 'zone:2',
    kind: 'zone',
    name: '말잇못존',
    color: '#8B5CF6',
    zoneId: 2,
    nodes: nodes(2),
  },
  {
    id: 'zone:3',
    kind: 'zone',
    name: '스쳐지나간존',
    color: null,
    zoneId: 3,
    nodes: [],
  },
  // 만들기 장은 목록에 나오지 않는다(고르는 일과 만드는 일은 다른 행동이다).
  {
    id: 'create',
    kind: 'create',
    name: '새 우주',
    color: null,
    zoneId: null,
    nodes: [],
  },
]

const meta = {
  title: 'Home/UniversePickerSheet',
  component: UniversePickerSheet,
  tags: ['autodocs'],
  args: {
    universes,
    index: 1,
    open: true,
    onOpenChange: () => {},
    onSelect: () => {},
  },
  render: (args) => {
    const [index, setIndex] = useState(args.index)
    return (
      <div className="mx-auto h-[560px] max-w-[430px]">
        <UniversePickerSheet {...args} index={index} onSelect={setIndex} />
      </div>
    )
  },
} satisfies Meta<typeof UniversePickerSheet>

export default meta

type Story = StoryObj<typeof meta>

export const OnZone: Story = {}

export const OnAll: Story = { args: { index: 0 } }

/** 존을 아직 만들지 않은 사용자 — 고를 수 있는 건 '전체' 하나뿐이다. */
export const NoZone: Story = {
  args: { universes: [universes[0], universes[4]], index: 0 },
}
