import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RelationGraphCanvas } from '@/components/home/relation-graph-canvas'
import type {
  GraphLink,
  GraphNode,
} from '@/components/home/relation-graph-canvas'
import { INTIMACY_DEFAULT } from '@/lib/intimacy-scale'
import { groupSize, memberPosition } from '@/lib/relation-graph-map'
import type { MapGroup } from '@/lib/relation-graph-map'

const work: MapGroup = {
  key: 'tag:1',
  name: '직장',
  color: '#22A06B',
  x: 24,
  y: 24,
  ...groupSize(3),
}
const school: MapGroup = {
  key: 'tag:2',
  name: '학교',
  color: '#8B5CF6',
  x: 24 + work.width + 28,
  y: 24,
  ...groupSize(2),
}

const member = (
  id: number,
  name: string,
  group: MapGroup,
  index: number,
  count: number,
): GraphNode => ({
  id,
  name,
  groupKey: group.key,
  ...memberPosition(group, index, count),
})

const seedNodes: GraphNode[] = [
  member(1, '김도현', work, 0, 3),
  member(2, '박서준', work, 1, 3),
  member(3, '오준영', work, 2, 3),
  member(4, '이지은', school, 0, 2),
  member(5, '최민석', school, 1, 2),
  // 어느 구역에도 안 든 사람 — 지도에서 정상 상태다.
  { id: 6, name: '강수빈', groupKey: null, x: 90, y: 300 },
]

const meta = {
  title: 'Home/RelationGraphCanvas',
  component: RelationGraphCanvas,
  tags: ['autodocs'],
  args: {
    groups: [work, school],
    nodes: seedNodes,
    links: [
      // 구역을 가로지르는 선 — 이 화면에서 제일 보고 싶은 것이다.
      { from: 1, to: 4, intimacy: 88, note: '대학 동아리 선후배' },
      { from: 2, to: 3, intimacy: 12, note: null },
      { from: 5, to: 6, intimacy: 50, note: null },
    ] satisfies GraphLink[],
    onMoveNode: () => {},
    onDropNode: () => {},
    onMoveGroup: () => {},
    onRemoveGroup: () => {},
    onConnect: () => {},
    onAddNode: () => {},
    onRemoveNode: () => {},
    onSelectLink: () => {},
  },
  render: (args) => {
    const [groups, setGroups] = useState(args.groups)
    const [nodes, setNodes] = useState(args.nodes)
    const [links, setLinks] = useState(args.links)
    return (
      <div className="mx-auto h-[560px] w-full max-w-[430px] p-4">
        <RelationGraphCanvas
          {...args}
          groups={groups}
          nodes={nodes}
          links={links}
          onMoveNode={(id, x, y) =>
            setNodes((current) =>
              current.map((node) =>
                node.id === id ? { ...node, x, y } : node,
              ),
            )
          }
          onDropNode={(id, groupKey) =>
            setNodes((current) =>
              current.map((node) =>
                node.id === id ? { ...node, groupKey } : node,
              ),
            )
          }
          onMoveGroup={(key, x, y) =>
            setGroups((current) =>
              current.map((group) =>
                group.key === key ? { ...group, x, y } : group,
              ),
            )
          }
          onRemoveGroup={(key) => {
            setGroups((current) => current.filter((group) => group.key !== key))
            setNodes((current) =>
              current.map((node) =>
                node.groupKey === key ? { ...node, groupKey: null } : node,
              ),
            )
          }}
          onConnect={(from, to) =>
            setLinks((current) => [
              ...current,
              { from, to, intimacy: INTIMACY_DEFAULT, note: null },
            ])
          }
          onRemoveNode={(id) => {
            setNodes((current) => current.filter((node) => node.id !== id))
            setLinks((current) =>
              current.filter((link) => link.from !== id && link.to !== id),
            )
          }}
        />
      </div>
    )
  },
} satisfies Meta<typeof RelationGraphCanvas>

export default meta

type Story = StoryObj<typeof meta>

/** 구역 두 채 + 들판의 한 사람. 구역을 가로지르는 선이 이 화면의 요점이다. */
export const WithGroups: Story = {}

/** 구역 없이 사람만 올린 지도 — 자유롭게 놓는 예전 방식도 그대로 된다. */
export const WithoutGroups: Story = {
  args: {
    groups: [],
    nodes: seedNodes.map((node) => ({ ...node, groupKey: null })),
  },
}

export const Empty: Story = {
  args: { groups: [], nodes: [], links: [] },
}
