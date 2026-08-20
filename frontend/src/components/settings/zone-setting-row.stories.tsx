import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ZoneResponse } from '@/apis/generated/mongle-api.schemas'
import { ZoneSettingRow } from '@/components/settings/zone-setting-row'

const zone: ZoneResponse = {
  id: 1,
  name: '최애존',
  color: '#E06A2B',
  order: 0,
  personIds: [1, 2, 3, 4, 5],
}

const meta = {
  title: 'Settings/ZoneSettingRow',
  component: ZoneSettingRow,
  tags: ['autodocs'],
  args: {
    zone,
    deletePending: false,
    onOpen: () => {},
    onEdit: () => {},
    onDelete: () => {},
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[430px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ZoneSettingRow>

export default meta

type Story = StoryObj<typeof meta>

export const Colored: Story = {}

/** 색을 고르지 않은 존은 무채색 점으로 남는다(색을 꾸며내지 않는다). */
export const NoColor: Story = {
  args: { zone: { ...zone, name: '말잇못존', color: null } },
}

export const Empty: Story = {
  args: { zone: { ...zone, name: '새 존', personIds: [] } },
}
