import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { TagInlineEditor } from '@/components/settings/tag-inline-editor'

function Controlled({ withColor }: { withColor: boolean }) {
  const [label, setLabel] = useState('대학 친구')
  const [color, setColor] = useState('#0EA5E9')
  return (
    <div className="max-w-sm p-4">
      <TagInlineEditor
        label={label}
        onLabelChange={setLabel}
        color={withColor ? color : undefined}
        onColorChange={withColor ? setColor : undefined}
        onSave={() => {}}
        onCancel={() => {}}
      />
    </div>
  )
}

const meta = {
  title: 'Settings/TagInlineEditor',
  component: TagInlineEditor,
  tags: ['autodocs'],
  args: {
    label: '대학 친구',
    onLabelChange: () => {},
    onSave: () => {},
    onCancel: () => {},
  },
  render: (args) => <Controlled withColor={args.color !== undefined} />,
} satisfies Meta<typeof TagInlineEditor>

export default meta

type Story = StoryObj<typeof meta>

// 색을 다루는 칩(관계 태그·루트 소속)은 색 선택기를 함께 연다.
export const WithColor: Story = {
  args: { color: '#0EA5E9', onColorChange: () => {} },
}

// 하위 소속처럼 색이 없는 칩은 이름만 고친다.
export const LabelOnly: Story = {}

export const Pending: Story = {
  args: { pending: true },
}
