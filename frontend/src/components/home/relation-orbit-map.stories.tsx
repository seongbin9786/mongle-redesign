import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type {
  MeNode,
  PersonNode,
  RelationEdge,
} from '@/apis/generated/mongle-api.schemas'
import { RelationOrbitMap } from '@/components/home/relation-orbit-map'
import { Button } from '@/components/ui/button'
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@/components/ui/empty-state'

const me: MeNode = {
  label: '나',
  id: 'me-uuid',
  name: '김성빈',
  profileImageUrl: null,
  avatarGender: 'MALE',
}

const TAGS = {
  family: { id: 1, label: '가족', color: '#E85D75' },
  friend: { id: 2, label: '친구', color: '#F97316' },
  work: { id: 3, label: '회사 동료', color: '#2563EB' },
} as const

function person(
  id: number,
  name: string,
  daysSinceLastMeet: number | null,
  tag: keyof typeof TAGS,
  options: Partial<PersonNode> = {},
): PersonNode {
  return {
    id,
    name,
    profileImageUrl: null,
    avatarGender: null,
    favorite: false,
    recordCount: 10,
    relationTags: [TAGS[tag]],
    intimacy: { status: 'NORMAL', daysSinceLastMeet },
    firstMetDate: '2023-03-01',
    ...options,
  }
}

const nodes: PersonNode[] = [
  person(1, '김도윤', 3, 'friend', { favorite: true }),
  person(2, '이서연', 6, 'family'),
  person(3, '정해인', 11, 'friend'),
  person(4, '박민준', 26, 'work'),
  person(5, '한지아', 33, 'friend'),
  person(6, '윤재원', 41, 'friend'),
  person(7, '최수현', 52, 'work'),
  person(8, '임나래', 96, 'work'),
  person(9, '오세훈', 124, 'friend'),
  person(10, '강다희', 151, 'friend'),
  person(11, '문가영', 178, 'family'),
  person(12, '류진우', 262, 'work'),
  person(13, '황지민', 305, 'friend', {
    intimacy: { status: 'DISTANT', daysSinceLastMeet: 305 },
  }),
  person(14, '신동엽', 342, 'work', {
    intimacy: { status: 'DISTANT', daysSinceLastMeet: 342 },
  }),
  person(15, '홍예지', null, 'friend'),
  // 태그가 없는 사람은 그룹 색 없이 무채색 테두리로 남는다.
  person(16, '배유진', 45, 'friend', { relationTags: [] }),
]

const edges: RelationEdge[] = nodes.map((node) => ({
  personId: node.id,
  distant: node.intimacy.status === 'DISTANT',
}))

const meta = {
  title: 'Home/RelationOrbitMap',
  component: RelationOrbitMap,
  tags: ['autodocs'],
  args: {
    me,
    nodes,
    edges,
    selectedTagIds: [],
    onSelectPerson: () => {},
  },
  render: (args) => {
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
    return (
      <div className="mx-auto max-w-[430px]">
        <div className="mb-3 flex gap-2">
          {Object.values(TAGS).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() =>
                setSelectedTagIds((current) =>
                  current.includes(tag.id)
                    ? current.filter((id) => id !== tag.id)
                    : [...current, tag.id],
                )
              }
              className="rounded-full border border-border px-3 py-1 text-xs"
              style={{
                backgroundColor: selectedTagIds.includes(tag.id)
                  ? tag.color
                  : undefined,
                color: selectedTagIds.includes(tag.id) ? '#fff' : undefined,
              }}
            >
              {tag.label}
            </button>
          ))}
        </div>
        <RelationOrbitMap
          {...args}
          selectedTagIds={selectedTagIds}
          onSelectPerson={() => {}}
        />
      </div>
    )
  },
} satisfies Meta<typeof RelationOrbitMap>

export default meta

type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Distant: Story = {
  args: {
    nodes: nodes.filter(
      (node) => node.intimacy.status === 'DISTANT' || node.id <= 3,
    ),
    edges: edges.filter((edge) => edge.distant || edge.personId <= 3),
  },
}

export const FamilyOnlyDimmed: Story = {
  render: (args) => (
    <RelationOrbitMap
      {...args}
      selectedTagIds={[TAGS.family.id]}
      onSelectPerson={() => {}}
    />
  ),
}

export const Empty: Story = {
  args: { nodes: [], edges: [] },
  render: (args) => (
    <RelationOrbitMap {...args} onSelectPerson={() => {}}>
      <div className="absolute inset-0 z-30 flex flex-col items-center px-8 pt-[82%] text-center">
        <EmptyState>
          <EmptyStateTitle>아직 기록한 사람이 없어요</EmptyStateTitle>
          <EmptyStateDescription>
            첫 사람을 추가해 관계를 남겨보세요.
          </EmptyStateDescription>
          <EmptyStateAction>
            <Button size="cta">＋ 사람 추가</Button>
          </EmptyStateAction>
        </EmptyState>
      </div>
    </RelationOrbitMap>
  ),
}
