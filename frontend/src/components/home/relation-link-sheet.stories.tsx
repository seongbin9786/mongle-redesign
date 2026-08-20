import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RelationLinkSheet } from '@/components/home/relation-link-sheet'
import type { EditingLink } from '@/components/home/relation-link-sheet'

const seed: EditingLink = {
  from: 1,
  to: 2,
  fromName: '김도현',
  toName: '박서준',
  intimacy: 72,
  note: '대학 동아리에서 만난 사이',
}

const meta = {
  title: 'Home/RelationLinkSheet',
  component: RelationLinkSheet,
  tags: ['autodocs'],
  args: {
    link: seed,
    onChange: () => {},
    onSave: () => {},
    onDisconnect: () => {},
    onOpenChange: () => {},
  },
  render: (args) => {
    const [link, setLink] = useState<EditingLink | null>(args.link)
    return (
      <div className="mx-auto h-[520px] max-w-[430px]">
        <RelationLinkSheet
          {...args}
          link={link}
          onChange={setLink}
          onSave={() => setLink(null)}
          onDisconnect={() => setLink(null)}
          onOpenChange={(open) => {
            if (!open) setLink(null)
          }}
        />
      </div>
    )
  },
} satisfies Meta<typeof RelationLinkSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Close: Story = {}

/** 아직 아무것도 적지 않은 새 연결(기본값 50). */
export const Fresh: Story = {
  args: { link: { ...seed, intimacy: 50, note: '' } },
}
