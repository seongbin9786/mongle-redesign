import { AppScreen } from '@/stackflow/components/app-screen'
import type { ActivityComponentType } from '@stackflow/react'
import { useAppFlow } from '@/stackflow/use-app-flow'

export const NotFoundActivity: ActivityComponentType<'NotFound'> = () => {
  const { replace } = useAppFlow()

  return (
    <AppScreen appBar={{ title: '없는 페이지' }}>
      <div className="mx-auto max-w-md space-y-4 bg-background px-5 py-10 text-center">
        <p className="text-sm text-muted-foreground">잘못된 경로예요.</p>
        <button
          type="button"
          onClick={() => replace('Main', { tab: 'home' })}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          홈으로
        </button>
      </div>
    </AppScreen>
  )
}
