import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ChipRef } from '@/apis/generated/mongle-api.schemas'
import { RelationTagFilter } from '@/components/home/relation-tag-filter'

const tags: ChipRef[] = [
  { id: 1, label: '가족', color: '#E85D75' },
  { id: 2, label: '친구', color: '#F97316' },
  { id: 3, label: '회사 동료', color: '#2563EB' },
  { id: 4, label: '스터디', color: '#22A06B' },
  { id: 5, label: '이웃', color: '#8B5CF6' },
]

const meta = {
  title: 'Home/RelationTagFilter',
  component: RelationTagFilter,
  tags: ['autodocs'],
  args: { tags, selectedId: null, onSelect: () => {} },
  render: (args) => {
    const [selectedId, setSelectedId] = useState<number | null>(args.selectedId)
    return (
      <RelationTagFilter
        {...args}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    )
  },
} satisfies Meta<typeof RelationTagFilter>

export default meta

type Story = StoryObj<typeof meta>

export const NoneSelected: Story = {}

export const OneSelected: Story = {
  args: { selectedId: 3 },
}
