import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { UniverseIndicator } from '@/components/home/universe-indicator'
import type { Universe } from '@/lib/home-universes'

const universes: Universe[] = [
  {
    id: 'all',
    kind: 'all',
    name: '전체',
    color: null,
    zoneId: null,
    nodes: [],
  },
  {
    id: 'zone:1',
    kind: 'zone',
    name: '최애존',
    color: '#E06A2B',
    zoneId: 1,
    nodes: [],
  },
  {
    id: 'zone:2',
    kind: 'zone',
    name: '말잇못존',
    color: '#8B5CF6',
    zoneId: 2,
    nodes: [],
  },
  {
    id: 'create',
    kind: 'create',
    name: '새 우주',
    color: null,
    zoneId: null,
    nodes: [],
  },
]

/** 존이 0개인 첫 사용자 — '전체'와 '존 만들기' 두 장이라 스와이프가 살아 있다. */
const firstTimeUniverses: Universe[] = [
  universes[0],
  {
    id: 'create',
    kind: 'create',
    name: '존 만들기',
    color: null,
    zoneId: null,
    nodes: [],
  },
]

const meta = {
  title: 'Home/UniverseIndicator',
  component: UniverseIndicator,
  tags: ['autodocs'],
  args: { universes, index: 0, onMove: () => {}, onOpenList: () => {} },
  render: (args) => {
    const [index, setIndex] = useState(args.index)
    return (
      <UniverseIndicator
        {...args}
        index={index}
        onMove={(direction) =>
          setIndex((current) =>
            Math.min(
              args.universes.length - 1,
              Math.max(0, current + direction),
            ),
          )
        }
      />
    )
  },
} satisfies Meta<typeof UniverseIndicator>

export default meta

type Story = StoryObj<typeof meta>

export const All: Story = {}

export const Zone: Story = {
  args: { index: 1 },
}

/** 마지막 장은 존이 아니라 '만들기' 안내다 — 점을 테두리만 남겨 구분한다. */
export const CreatePage: Story = {
  args: { index: 3 },
}

export const FirstTime: Story = {
  args: { universes: firstTimeUniverses },
}

/** 존 상한(12개)에 닿으면 만들기 장이 접혀, 우주가 한 장뿐인 경우만 남는다. */
export const SingleUniverse: Story = {
  args: { universes: [universes[0]] },
}
