import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PersonResponse } from '@/apis/generated/mongle-api.schemas'
import { PersonDirectoryRow } from '@/components/person/person-directory-row'
import { ListGroup } from '@/components/ui/list-group'

const base: PersonResponse = {
  id: 1,
  name: '김서연',
  gender: 'FEMALE',
  favorite: false,
  lastMetDate: '2026-08-06',
  affiliation: null,
  relationTags: [],
  likes: [],
  cautions: [],
  recordCount: 3,
}

const withNestedAffiliation: PersonResponse = {
  ...base,
  favorite: true,
  affiliation: {
    id: 21,
    label: '대학교',
    color: null,
    parent: { id: 20, label: '학교', color: '#0EA5E9' },
  },
  relationTags: [
    { id: 1, label: '친구' },
    { id: 2, label: '대학동기' },
  ],
}

const meta = {
  title: 'Person/PersonDirectoryRow',
  component: PersonDirectoryRow,
  tags: ['autodocs'],
  args: {
    person: base,
    withDivider: false,
    onSelect: () => {},
    onToggleFavorite: () => {},
  },
  render: (args) => (
    <div className="max-w-md p-4">
      <ListGroup>
        <PersonDirectoryRow {...args} />
      </ListGroup>
    </div>
  ),
} satisfies Meta<typeof PersonDirectoryRow>

export default meta

type Story = StoryObj<typeof meta>

// 소속이 없으면 ring을 칠하지 않고 무채색을 유지한다.
export const NoAffiliation: Story = {}

// 루트 소속만 있으면 ring 색 + 텍스트 라벨.
export const RootAffiliation: Story = {
  args: {
    person: {
      ...base,
      affiliation: { id: 20, label: '직장', color: '#22A06B' },
      relationTags: [{ id: 3, label: '동료' }],
    },
  },
}

// 하위 소속은 무채색 chip으로 덧붙고, ring 색은 루트가 정한다.
export const NestedAffiliationAndFavorite: Story = {
  args: { person: withNestedAffiliation },
}

export const NeverMet: Story = {
  args: {
    person: { ...base, lastMetDate: null, recordCount: 0 },
  },
}

export const InList: Story = {
  render: (args) => (
    <div className="max-w-md p-4">
      <ListGroup>
        <PersonDirectoryRow
          {...args}
          person={withNestedAffiliation}
          withDivider
        />
        <PersonDirectoryRow
          {...args}
          person={{
            ...base,
            id: 2,
            name: '이준호',
            gender: 'MALE',
            lastMetDate: '2026-07-07',
            affiliation: { id: 22, label: '직장', color: '#22A06B' },
          }}
          withDivider
        />
        <PersonDirectoryRow
          {...args}
          person={{
            ...base,
            id: 3,
            name: '정하준',
            gender: 'MALE',
            lastMetDate: null,
            recordCount: 0,
          }}
          withDivider={false}
        />
      </ListGroup>
    </div>
  ),
}
