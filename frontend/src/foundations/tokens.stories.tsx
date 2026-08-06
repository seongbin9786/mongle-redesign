import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

const meta = {
  title: 'Foundations/토큰',
  tags: ['autodocs'],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

/* 값을 문서에 옮겨 적지 않는다. 토큰 정본(styles/tokens.css,
   styles/semantic.css)에서 런타임에 읽는다. documentElement의 class(.dark)
   변화를 관찰해 툴바 테마 전환 시 값도 따라 갱신된다. */
function TokenValue({ name }: { name: string }) {
  const [value, setValue] = useState('')
  useEffect(() => {
    const read = () =>
      setValue(
        getComputedStyle(document.documentElement)
          .getPropertyValue(name)
          .trim(),
      )
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [name])
  return (
    <code className="text-caption text-muted-foreground">{value || '-'}</code>
  )
}

function Swatch({
  token,
  onDark = false,
}: {
  token: string
  onDark?: boolean
}) {
  return (
    <div className="text-label flex items-center gap-3">
      <div
        className="border-border h-7 w-12 rounded-[var(--gyeol-radius)] border"
        style={{
          background: onDark ? 'var(--gyeol-ink-100)' : undefined,
        }}
      >
        <div
          className="h-full w-full rounded-[inherit]"
          style={{ background: `var(${token})` }}
        />
      </div>
      <code className="text-caption w-60">{token}</code>
      <TokenValue name={token} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-120 flex-col gap-2">
      <h3 className="text-body font-semibold">{title}</h3>
      {children}
    </section>
  )
}

const inkRamp = [
  '--gyeol-paper',
  '--gyeol-ink-05',
  '--gyeol-ink-10',
  '--gyeol-ink-15',
  '--gyeol-ink-20',
  '--gyeol-ink-35',
  '--gyeol-ink-45',
  '--gyeol-ink-50',
  '--gyeol-ink-60',
  '--gyeol-ink-85',
  '--gyeol-ink-90',
  '--gyeol-ink-95',
  '--gyeol-ink-100',
]

const semanticRoles = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--muted-soft',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--border',
  '--input',
  '--ring',
  '--warm',
]

export const Colors: Story = {
  render: () => (
    <div className="bg-background text-foreground flex flex-col gap-8 p-6">
      <Section title="잉크 중성 램프 (primitive)">
        {inkRamp.map((token) => (
          <Swatch key={token} token={token} />
        ))}
        <p className="text-caption text-muted-foreground max-w-135">
          테마와 무관한 원시 값이다. 번호가 클수록 잉크에 가깝다. hue 286의
          미세한 보라 기운으로 순수 회색보다 종이에 가깝게 돈다.
        </p>
      </Section>
      <Section title="흰색 저투명 (primitive)">
        <Swatch token="--gyeol-white-10" onDark />
        <Swatch token="--gyeol-white-15" onDark />
        <p className="text-caption text-muted-foreground max-w-135">
          다크 테마의 머리선과 입력 테두리는 램프 색 대신 흰색 저투명을 쓴다.
        </p>
      </Section>
      <Section title="따뜻한 시그널과 파괴 (primitive)">
        <Swatch token="--gyeol-warm" />
        <Swatch token="--gyeol-warm-bright" />
        <Swatch token="--gyeol-red" />
        <Swatch token="--gyeol-red-bright" />
        <p className="text-caption text-muted-foreground max-w-135">
          따뜻한 시그널은 아이브로우, 환기 안내 등 한두 군데만 아껴 쓴다.
        </p>
      </Section>
      <Section title="시맨틱 역할">
        {semanticRoles.map((token) => (
          <Swatch key={token} token={token} />
        ))}
        <p className="text-caption text-muted-foreground max-w-135">
          역할 토큰은 라이트와 다크에서 서로 다른 primitive를 가리킨다. 툴바의
          테마를 전환하면 값과 스와치가 함께 뒤집힌다. 반전은 시맨틱
          층(styles/semantic.css)에서만 일어난다.
        </p>
      </Section>
    </div>
  ),
}

const typeScale = [
  ['caption', 'text-caption'],
  ['label', 'text-label'],
  ['body', 'text-body'],
] as const

export const Typography: Story = {
  render: () => (
    <div className="bg-background text-foreground flex flex-col gap-4 p-6">
      {typeScale.map(([step, sizeClass]) => (
        <div key={step} className="text-label flex items-baseline gap-3">
          <code className="text-caption w-40 shrink-0">
            --gyeol-text-{step}
          </code>
          <span className={`${sizeClass} font-semibold`}>
            세상이 가까워진다
          </span>
          <TokenValue name={`--gyeol-text-${step}`} />
        </div>
      ))}
      <div className="text-label flex items-baseline gap-3">
        <code className="text-caption w-40 shrink-0">--font-hand</code>
        <span className="font-hand text-body">손글씨로 남기는 기록</span>
      </div>
      <p className="text-caption text-muted-foreground max-w-135">
        Pretendard 산스 단일. weight 상한 600 (800/900 금지, 예외는 브랜드 로고
        워드마크뿐). font-size만 토큰으로 고정하고 line-height는 사용처의
        leading 클래스가 결정한다. 손글씨 폰트(온글잎 은별)는 기록 작성 같은
        유저 입력, 감성 화면 전용이다.
      </p>
    </div>
  ),
}

export const Radius: Story = {
  render: () => (
    <div className="bg-background text-foreground flex flex-col gap-4 p-6">
      <div className="text-label flex items-center gap-3">
        <code className="text-caption w-40">--gyeol-radius</code>
        <TokenValue name="--gyeol-radius" />
      </div>
      <div className="flex items-end gap-4">
        {(
          [
            ['rounded-sm', 'sm'],
            ['rounded-md', 'md'],
            ['rounded-lg', 'lg'],
            ['rounded-xl', 'xl'],
            ['rounded-full', 'pill'],
          ] as const
        ).map(([className, label]) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div
              className={`bg-secondary border-border h-20 w-20 border ${className}`}
            />
            <span className="text-caption text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-caption text-muted-foreground max-w-135">
        기준 12px에서 sm 8, md 10, lg 12, xl 16으로 파생한다. 칩, 버튼, FAB,
        아이콘 버튼은 전 형태 pill(rounded-full)이다.
      </p>
    </div>
  ),
}

const elevations = [
  ['e1', 'shadow-e1'],
  ['e2', 'shadow-e2'],
  ['e3', 'shadow-e3'],
  ['e4', 'shadow-e4'],
] as const

export const Elevation: Story = {
  render: () => (
    <div className="bg-background text-foreground flex flex-col gap-4 p-6">
      <div className="flex gap-6">
        {elevations.map(([step, shadowClass]) => (
          <div key={step} className="flex flex-col items-center gap-2">
            <div
              className={`bg-card rounded-xl ${shadowClass} flex h-24 w-28 items-center justify-center`}
            >
              {step}
            </div>
            <span className="text-caption text-muted-foreground">
              --elevation-{step.slice(1)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-caption text-muted-foreground max-w-135">
        e1 카드, e3 FAB, e4 플로팅. 그림자 색은 테마 종속이라 시맨틱 층에서
        라이트와 다크 각각 정의한다. 툴바 테마를 전환하면 농도가 함께 뒤집힌다.
      </p>
    </div>
  ),
}

export const Texture: Story = {
  render: () => (
    <div className="bg-background text-foreground flex flex-col gap-4 p-6">
      <div
        className="bg-card border-border h-32 w-full max-w-135 rounded-xl border p-4"
        style={{ backgroundImage: 'var(--letter-paper)' }}
      >
        <p className="text-body">오늘 엄마랑 봄나들이를 갔다.</p>
      </div>
      <p className="text-caption text-muted-foreground max-w-135">
        기록 편지지 괘선(--letter-paper). 배경 이미지라 currentColor를 못
        받으므로 라이트와 다크 각각 정의한다. 다크에서는 흰색 저투명으로
        뒤집는다.
      </p>
    </div>
  ),
}
