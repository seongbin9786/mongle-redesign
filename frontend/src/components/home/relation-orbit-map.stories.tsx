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

// 7단 링(7일 / 1달 / 3달 / 올해 / 1년 / 3년 / 그 이전)을 골고루 밟도록 흩었다.
const nodes: PersonNode[] = [
  person(1, '김도윤', 1, 'friend', { favorite: true }),
  person(2, '이서연', 6, 'family'),
  person(3, '정해인', 11, 'friend'),
  person(4, '박민준', 26, 'work'),
  person(5, '한지아', 33, 'friend'),
  person(6, '윤재원', 41, 'friend'),
  person(7, '최수현', 88, 'work'),
  person(8, '임나래', 96, 'work'),
  person(9, '오세훈', 124, 'friend'),
  person(10, '강다희', 151, 'friend'),
  person(11, '문가영', 300, 'family'),
  person(12, '류진우', 340, 'work'),
  person(13, '황지민', 700, 'friend', {
    intimacy: { status: 'DISTANT', daysSinceLastMeet: 700 },
  }),
  person(14, '신동엽', 1400, 'work', {
    intimacy: { status: 'DISTANT', daysSinceLastMeet: 1400 },
  }),
  person(15, '홍예지', null, 'friend'),
  // 태그가 없는 사람은 그룹 색 없이 무채색 테두리로 남는다.
  person(16, '배유진', 45, 'friend', { relationTags: [] }),
]

const edges: RelationEdge[] = nodes.map((node) => ({
  personId: node.id,
  distant: node.intimacy.status === 'DISTANT',
}))

// 지도는 부모가 준 높이를 채우므로 스토리에서도 화면만 한 상자를 준다.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto h-[560px] w-full max-w-[430px]">{children}</div>
  )
}

// 우주 = '전체' + 존별 한 장. 스토리에서도 홈과 같은 구성으로 넘겨 본다.
const UNIVERSES = [
  { id: 'all', name: '전체', nodes },
  { id: 'zone:1', name: '최애존', nodes: nodes.filter((n) => n.id <= 5) },
  { id: 'zone:2', name: '스쳐지나간존', nodes: nodes.filter((n) => n.id > 12) },
] as const

const meta = {
  title: 'Home/RelationOrbitMap',
  component: RelationOrbitMap,
  tags: ['autodocs'],
  args: {
    me,
    nodes,
    edges,
    universeId: 'all',
    enterDirection: 0 as const,
    depth: 'tilt' as const,
    onToggleDepth: () => {},
    onSelectPerson: () => {},
  },
  render: (args) => {
    const [index, setIndex] = useState(0)
    const [enterDirection, setEnterDirection] = useState<1 | -1 | 0>(0)
    const [depth, setDepth] = useState(args.depth)
    const universe = UNIVERSES[index]
    const move = (direction: 1 | -1) => {
      const next = Math.min(
        UNIVERSES.length - 1,
        Math.max(0, index + direction),
      )
      if (next === index) return
      setEnterDirection(direction)
      setIndex(next)
    }
    return (
      <div className="mx-auto max-w-[430px]">
        <div className="mb-3 flex items-center justify-center gap-3 text-xs">
          <button type="button" onClick={() => move(-1)}>
            ◀
          </button>
          <span className="font-semibold">{universe.name}</span>
          <button type="button" onClick={() => move(1)}>
            ▶
          </button>
        </div>
        <Frame>
          <RelationOrbitMap
            {...args}
            nodes={[...universe.nodes]}
            universeId={universe.id}
            enterDirection={enterDirection}
            swipe={{
              canSwipe: (direction) =>
                index + direction >= 0 && index + direction < UNIVERSES.length,
              onSwipe: move,
            }}
            depth={depth}
            onToggleDepth={() =>
              setDepth((current) => (current === 'tilt' ? 'focus' : 'tilt'))
            }
            onSelectPerson={() => {}}
          />
        </Frame>
      </div>
    )
  },
} satisfies Meta<typeof RelationOrbitMap>

export default meta

type Story = StoryObj<typeof meta>

/** 기본 — 궤도판을 눕혀 바깥이 지평선으로 물러난다. 사람은 세워 둔다. */
export const Tilt: Story = { args: { universeId: 'all', enterDirection: 0 } }

/** 초점이 '나'에 맞고 바깥이 아웃포커스로 풀린다. 화면 위 토글로 바꾼다. */
export const Focus: Story = {
  args: { depth: 'focus', universeId: 'all', enterDirection: 0 },
}

export const Distant: Story = {
  args: {
    universeId: 'all',
    enterDirection: 0,
    nodes: nodes.filter(
      (node) => node.intimacy.status === 'DISTANT' || node.id <= 3,
    ),
    edges: edges.filter((edge) => edge.distant || edge.personId <= 3),
  },
}

/**
 * 사람이 몰리면 한 줄에 밀어 넣지 않고 여러 줄로 앉히고(안쪽 줄일수록 최근),
 * 이웃이 가까울수록 얼굴이 물러서고 이름이 접힌다. 확대하면 다시 나타난다.
 */
export const Crowded: Story = {
  args: {
    universeId: 'all',
    enterDirection: 0,
    nodes: Array.from({ length: 40 }, (_, index) =>
      person(100 + index, `친구${index + 1}`, 1 + index * 2, 'friend'),
    ),
    edges: [],
  },
}

/** 존 우주 한 장 — 담긴 사람만 남고 나머지는 이 우주에 아예 없다(흐림이 아니다). */
export const ZoneUniverse: Story = {
  args: {
    nodes: nodes.filter((node) => node.id <= 5),
    edges: edges.filter((edge) => edge.personId <= 5),
    universeId: 'zone:1',
    enterDirection: 1,
  },
  render: (args) => (
    <Frame>
      <RelationOrbitMap {...args} onSelectPerson={() => {}} />
    </Frame>
  ),
}

export const Empty: Story = {
  args: { nodes: [], edges: [], universeId: 'all', enterDirection: 0 },
  render: (args) => (
    <Frame>
      <RelationOrbitMap {...args} onSelectPerson={() => {}}>
        <div className="absolute inset-x-0 bottom-2 z-30 flex flex-col items-center px-8 text-center">
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
    </Frame>
  ),
}
