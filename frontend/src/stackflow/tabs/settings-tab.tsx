import { useMutation } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { MongleLogo } from '@/components/brand/mongle-logo'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { ConfirmPopup } from '@/components/ui/confirm-popup'
import { NavigationRow } from '@/components/ui/navigation-row'
import { PageTitle } from '@/components/ui/page-title'
import { ScrollBody } from '@/components/ui/scroll-body'
import { ListGroup } from '@/components/ui/list-group'
import { ListGroupItem } from '@/components/ui/list-group-item'
import { ListGroupLabel } from '@/components/ui/list-group-label'
import { Switch } from '@/components/ui/switch'
import { userMutation } from '@/apis/mutations'
import { featureEvents, resetAnalytics, trackFeature } from '@/lib/analytics'
import { clearToken } from '@/lib/auth-token'
import { clearUserIdentity } from '@/lib/user-identity'
import { useAppFlow } from '@/stackflow/use-app-flow'
import { TabShell } from '@/stackflow/components/tab-shell'

export function SettingsTab() {
  const { push } = useAppFlow()
  const { theme, setTheme } = useTheme()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const resetMutation = useMutation({
    ...userMutation.removeCurrent(),
    onSuccess: async () => {
      await trackFeature(featureEvents.userDataReset)
      resetAnalytics()
      clearToken()
      clearUserIdentity()
      window.location.replace('/')
    },
  })

  const handleDarkModeChange = (checked: boolean) => {
    const nextTheme = checked ? 'dark' : 'light'
    setTheme(nextTheme)
    void trackFeature(featureEvents.themeChanged, { theme: nextTheme })
  }

  return (
    <TabShell layout="fixed">
      <header className="shrink-0 pb-4">
        <MongleLogo className="mb-5 text-foreground" />
        <PageTitle>설정</PageTitle>
      </header>

      <ScrollBody pad="tabbar" className="space-y-6">
        <ListGroup>
          <NavigationRow
            label="홈 설정"
            onClick={() => push('HomeSettings', {})}
          />
          <NavigationRow
            label="태그 설정"
            withDivider={false}
            onClick={() => push('TagSettings', {})}
          />
        </ListGroup>

        <section>
          <ListGroupLabel>화면</ListGroupLabel>
          <ListGroup>
            <ListGroupItem withDivider={false}>
              <div className="flex min-h-9 items-center justify-between gap-4">
                <span className="text-body font-semibold text-foreground">
                  다크 모드
                </span>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={handleDarkModeChange}
                  aria-label="다크 모드"
                />
              </div>
            </ListGroupItem>
          </ListGroup>
        </section>

        <section>
          <ListGroupLabel>테스트</ListGroupLabel>
          <ListGroup>
            <ListGroupItem withDivider={false}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-body font-semibold text-foreground">
                    테스트 사용자 초기화
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    새 사용자 흐름을 처음부터 확인해요
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="pill-sm"
                  disabled={resetMutation.isPending}
                  onClick={() => setConfirmOpen(true)}
                  className="shrink-0"
                >
                  <RotateCcw className="size-3.5" />
                  초기화
                </Button>
              </div>
              {resetMutation.isError ? (
                <p className="mt-3 text-xs font-semibold text-destructive">
                  초기화하지 못했어요. 잠시 후 다시 시도해 주세요.
                </p>
              ) : null}
            </ListGroupItem>
          </ListGroup>
        </section>

        <section>
          <ListGroupLabel>정보</ListGroupLabel>
          <ListGroup>
            <ListGroupItem withDivider={false}>
              <div className="flex items-center justify-between">
                <span className="text-body font-semibold text-foreground">
                  Mongle
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  MVP
                </span>
              </div>
            </ListGroupItem>
          </ListGroup>
        </section>
      </ScrollBody>

      <ConfirmPopup
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="테스트 사용자를 초기화할까요?"
        description="현재 사용자를 삭제하고 이름 입력 화면부터 다시 시작해요."
        error={
          resetMutation.isError
            ? '초기화하지 못했어요. 잠시 후 다시 시도해 주세요.'
            : undefined
        }
        confirmLabel="초기화"
        destructive
        pending={resetMutation.isPending}
        onConfirm={() => resetMutation.mutate()}
      />
    </TabShell>
  )
}
