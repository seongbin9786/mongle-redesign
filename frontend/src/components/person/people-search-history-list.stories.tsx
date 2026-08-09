import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { PeopleSearchHistoryList } from '@/components/person/people-search-history-list'

function Controlled({ initial }: { initial: string[] }) {
  const [terms, setTerms] = useState(initial)
  return (
    <div className="max-w-md p-4">
      <PeopleSearchHistoryList
        terms={terms}
        onSelect={() => {}}
        onRemove={(term) => setTerms(terms.filter((item) => item !== term))}
        onClearAll={() => setTerms([])}
      />
    </div>
  )
}

const meta = {
  title: 'Person/PeopleSearchHistoryList',
  component: PeopleSearchHistoryList,
  tags: ['autodocs'],
  args: {
    terms: ['서연', '대학교', '직장'],
    onSelect: () => {},
    onRemove: () => {},
    onClearAll: () => {},
  },
  render: (args) => <Controlled initial={args.terms} />,
} satisfies Meta<typeof PeopleSearchHistoryList>

export default meta

type Story = StoryObj<typeof meta>

export const WithHistory: Story = {}

export const EmptyHistory: Story = {
  args: { terms: [] },
}
