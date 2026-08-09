import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PersonNode } from '@/apis/generated/mongle-api.schemas'
import { PersonCardSheet } from '@/components/home/person-card-sheet'
import { Button } from '@/components/ui/button'

const person: PersonNode = {
  id: 2,
  name: '이서연',
  profileImageUrl: null,
  avatarGender: 'FEMALE',
  favorite: true,
  recordCount: 41,
  relationTags: [{ id: 1, label: '가족', color: '#E85D75' }],
  intimacy: {
    status: 'NORMAL',
    averageIntervalDays: 7,
    daysSinceLastMeet: 6,
  },
  firstMetDate: '1997-05-01',
}

const meta = {
  title: 'Home/PersonCardSheet',
  component: PersonCardSheet,
  tags: ['autodocs'],
  args: {
    person,
    onOpenChange: () => {},
    onRecord: () => {},
    onProfile: () => {},
  },
  render: (args) => {
    const [open, setOpen] = useState(true)
    return (
      <div className="p-4">
        <Button type="button" onClick={() => setOpen(true)}>
          관계 카드 열기
        </Button>
        <PersonCardSheet
          {...args}
          person={open ? (args.person ?? person) : null}
          onOpenChange={setOpen}
          onRecord={() => setOpen(false)}
          onProfile={() => setOpen(false)}
        />
      </div>
    )
  },
} satisfies Meta<typeof PersonCardSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Normal: Story = {}

/** 멀어진 관계여도 시트는 달라지지 않는다 — 흐림·점선은 지도가 전담한다. */
export const Distant: Story = {
  args: {
    person: {
      ...person,
      id: 13,
      name: '황지민',
      favorite: false,
      recordCount: 19,
      relationTags: [{ id: 2, label: '친구', color: '#F97316' }],
      intimacy: {
        status: 'DISTANT',
        averageIntervalDays: 45,
        daysSinceLastMeet: 305,
      },
      firstMetDate: '2016-08-01',
    },
  },
}

export const NoFirstMetDate: Story = {
  args: {
    person: {
      ...person,
      firstMetDate: null,
      intimacy: { status: 'UNKNOWN', daysSinceLastMeet: null },
    },
  },
}
