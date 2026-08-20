import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { IntimacySlider } from '@/components/home/intimacy-slider'

const meta = {
  title: 'Home/IntimacySlider',
  component: IntimacySlider,
  tags: ['autodocs'],
  args: { value: 50, onChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <div className="mx-auto max-w-[430px] p-6">
        <p className="mb-2 text-caption font-medium text-muted-foreground">
          친밀도 {value}
        </p>
        <IntimacySlider value={value} onChange={setValue} />
      </div>
    )
  },
} satisfies Meta<typeof IntimacySlider>

export default meta

type Story = StoryObj<typeof meta>

export const Middle: Story = {}

export const Far: Story = { args: { value: 0 } }

export const Close: Story = { args: { value: 100 } }
