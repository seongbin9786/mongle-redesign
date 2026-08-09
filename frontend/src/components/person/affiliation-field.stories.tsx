import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { ChipResponse } from '@/apis/generated/mongle-api.schemas'
import { AffiliationField } from '@/components/person/affiliation-field'

function chip(
  id: number,
  label: string,
  color: string | null,
  parentId: number | null,
  order: number,
): ChipResponse {
  return {
    id,
    type: 'AFFILIATION',
    parentId,
    label,
    color,
    personal: true,
    order,
    default: false,
  }
}

const affiliations: ChipResponse[] = [
  chip(20, '학교', '#0EA5E9', null, 0),
  chip(21, '대학교', null, 20, 1),
  chip(22, '고등학교', null, 20, 2),
  chip(23, '직장', '#22A06B', null, 3),
  chip(24, '가족', '#E85D75', null, 4),
]

function Controlled({
  chips,
  initial,
}: {
  chips: ChipResponse[]
  initial: number | null
}) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <div className="max-w-md p-4">
      <AffiliationField
        affiliations={chips}
        value={value}
        onChange={setValue}
        onCreate={() => {}}
      />
    </div>
  )
}

const meta = {
  title: 'Person/AffiliationField',
  component: AffiliationField,
  tags: ['autodocs'],
  args: {
    affiliations,
    value: null,
    onChange: () => {},
  },
  render: (args) => (
    <Controlled chips={args.affiliations} initial={args.value} />
  ),
} satisfies Meta<typeof AffiliationField>

export default meta

type Story = StoryObj<typeof meta>

export const Unselected: Story = {}

// 루트를 고르면 그 아래 세부 소속이 드러난다.
export const RootSelected: Story = {
  args: { value: 20 },
}

export const ChildSelected: Story = {
  args: { value: 21 },
}

export const Empty: Story = {
  args: { affiliations: [] },
}
