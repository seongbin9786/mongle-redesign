import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { TagCreateRow } from '@/components/settings/tag-create-row'

function Controlled({
  placeholder,
  swatchColor,
}: {
  placeholder: string
  swatchColor?: string
}) {
  const [value, setValue] = useState('')
  return (
    <div className="max-w-sm p-4">
      <TagCreateRow
        value={value}
        onChange={setValue}
        onSubmit={() => setValue('')}
        placeholder={placeholder}
        swatchColor={swatchColor}
      />
    </div>
  )
}

const meta = {
  title: 'Settings/TagCreateRow',
  component: TagCreateRow,
  tags: ['autodocs'],
  args: {
    value: '',
    onChange: () => {},
    onSubmit: () => {},
    placeholder: '새 태그 이름 (10자 이내)',
  },
  render: (args) => (
    <Controlled placeholder={args.placeholder} swatchColor={args.swatchColor} />
  ),
} satisfies Meta<typeof TagCreateRow>

export default meta

type Story = StoryObj<typeof meta>

export const WithSwatch: Story = {
  args: { swatchColor: '#22A06B' },
}

// 하위 소속은 색이 없어 swatch 없이 이름만 받는다.
export const WithoutSwatch: Story = {
  args: { placeholder: "'학교' 아래 세부 소속" },
}
