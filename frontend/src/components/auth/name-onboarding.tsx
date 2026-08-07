import { useState } from 'react'
import { MongleLogo } from '@/components/brand/mongle-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NameOnboarding({
  onSubmit,
  pending = false,
}: {
  onSubmit: (username: string) => void
  pending?: boolean
}) {
  const [username, setUsername] = useState('')
  const normalized = username.trim()

  return (
    <main className="relative flex h-full flex-col overflow-hidden bg-background px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div
        aria-hidden
        className="absolute -top-24 -right-20 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-16 -left-24 size-56 rounded-full bg-amber-200/20 blur-3xl"
      />

      <MongleLogo className="relative text-foreground" />

      <form
        className="relative my-auto"
        onSubmit={(event) => {
          event.preventDefault()
          if (normalized && !pending) onSubmit(normalized)
        }}
      >
        <p className="mb-3 text-sm font-semibold text-primary">
          1 / 2 · 처음 만났네요
        </p>
        <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.04em] text-foreground">
          당신을 어떻게
          <br />
          부르면 좋을까요?
        </h1>
        <p className="mt-4 max-w-xs text-body font-medium leading-6 text-muted-foreground">
          이름과 관계 기록은 이 브라우저의 나만의 공간에 연결돼요.
        </p>

        <label className="mt-10 block">
          <span className="sr-only">이름</span>
          <Input
            autoFocus
            autoComplete="name"
            enterKeyHint="done"
            maxLength={20}
            placeholder="이름을 입력해 주세요"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-14 rounded-2xl border-border/70 bg-card px-4 text-base font-semibold shadow-sm"
          />
        </label>

        <Button
          type="submit"
          size="lg"
          disabled={!normalized || pending}
          className="mt-4 h-14 w-full rounded-2xl text-base font-semibold"
        >
          {pending ? '공간을 여는 중...' : '다음'}
        </Button>
      </form>

      <p className="relative text-center text-xs font-medium text-muted-foreground">
        별도의 계정이나 비밀번호는 필요하지 않아요.
      </p>
    </main>
  )
}
