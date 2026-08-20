import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PersonResponse } from '@/apis/generated/mongle-api.schemas'
import { PersonPickRow } from '@/components/person/person-pick-row'
import { ListGroup } from '@/components/ui/list-group'

const person = {
  id: 1,
  name: '김도현',
  profileImageUrl: null,
  gender: 'MALE',
  favorite: false,
  affiliation: { id: 10, label: '직장', color: '#22A06B', parent: null },
  relationTags: [],
  lastMetDate: '2026-08-01',
  recordCount: 12,
} as unknown as PersonResponse

const meta = {
  title: 'Person/PersonPickRow',
  component: PersonPickRow,
  tags: ['autodocs'],
  args: { person, selected: false, withDivider: false, onToggle: () => {} },
  render: (args) => {
    const [selected, setSelected] = useState(args.selected)
    return (
      <div className="mx-auto max-w-[430px] p-4">
        <ListGroup>
          <PersonPickRow
            {...args}
            selected={selected}
            onToggle={() => setSelected((current) => !current)}
          />
        </ListGroup>
      </div>
    )
  },
} satisfies Meta<typeof PersonPickRow>

export default meta

type Story = StoryObj<typeof meta>

export const Unselected: Story = {}

export const Selected: Story = {
  args: { selected: true },
}
