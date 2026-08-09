import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { GetPersonsSort } from '@/apis/generated/mongle-api.schemas'
import { PersonSortSelect } from '@/components/person/person-sort-select'

function Controlled({ initial }: { initial: GetPersonsSort }) {
  const [value, setValue] = useState<GetPersonsSort>(initial)
  return (
    <div className="flex justify-end p-4">
      <PersonSortSelect value={value} onValueChange={setValue} />
    </div>
  )
}

const meta = {
  title: 'Person/PersonSortSelect',
  component: PersonSortSelect,
  tags: ['autodocs'],
  args: {
    value: 'RECENT',
    onValueChange: () => {},
  },
  render: (args) => <Controlled initial={args.value} />,
} satisfies Meta<typeof PersonSortSelect>

export default meta

type Story = StoryObj<typeof meta>

export const LastMet: Story = {}

export const RecordCount: Story = {
  args: { value: 'RECORD_COUNT' },
}

export const Name: Story = {
  args: { value: 'NAME' },
}
