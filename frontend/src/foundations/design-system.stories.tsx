import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

const meta = {
  title: 'Foundations/디자인 시스템',
  tags: ['autodocs'],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-body font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function Layer({
  name,
  file,
  desc,
}: {
  name: string
  file: string
  desc: string
}) {
  return (
    <div className="bg-card border-border rounded-xl border p-4">
      <p className="text-label font-semibold">{name}</p>
      <code className="text-caption text-muted-foreground">{file}</code>
      <p className="text-label text-muted-foreground mt-1">{desc}</p>
    </div>
  )
}

export const Gyeol: Story = {
  render: () => (
    <div className="bg-background text-foreground flex max-w-160 flex-col gap-8 p-6">
      <Section title="정수">
        <p className="text-label max-w-135">
          편집적 절제. 잉크 중성 램프와 종이 표면 위에 따뜻한 시그널 한 색만
          아껴 쓴다. 관계 궤도 프로토타입의 디자인 언어를 앱 전역으로 채택한
          것이며, 정본은 docs/design-system-gyeol.md다.
        </p>
      </Section>

      <Section title="토큰 층 구조">
        <div className="flex flex-col gap-2">
          <Layer
            name="1. primitive"
            file="src/styles/tokens.css"
            desc="테마와 무관한 원시 값. --gyeol- 접두. 잉크 램프, 흰색 저투명, 웜, 레드, 반경 기준, 타이포 스케일, 폰트 스택."
          />
          <Layer
            name="2. semantic"
            file="src/styles/semantic.css"
            desc="역할 토큰. light/dark 반전이 일어나는 유일한 층. .dark에서 primitive를 다시 가리킨다. 이름은 shadcn 규약 유지."
          />
          <Layer
            name="3. Tailwind 매핑"
            file="src/styles.css의 @theme inline"
            desc="시맨틱 토큰을 유틸 클래스로 매핑. bg-background, text-muted-foreground 등."
          />
        </div>
        <p className="text-caption text-muted-foreground max-w-135">
          규칙: 컴포넌트는 시맨틱 유틸만 쓴다. 원시 값(--gyeol-*)을 클래스나
          인라인으로 직접 쓰지 않는다. 새 색이 필요하면 primitive에 추가하고
          시맨틱 역할을 부여한 뒤 유틸로 소비한다.
        </p>
      </Section>

      <Section title="핵심 규칙">
        <ul className="text-label list-disc space-y-1 pl-5">
          <li>Pretendard 산스 단일, 세리프 없음. weight 상한 600.</li>
          <li>칩, 버튼, FAB, 아이콘 버튼은 전 형태 pill(rounded-full).</li>
          <li>
            따뜻한 시그널(--warm)은 아이브로우, 환기 안내 등 한두 군데만 아껴
            쓴다.
          </li>
          <li>층(depth)은 그림자가 아니라 면 색으로 만든다.</li>
          <li>그림자는 떠 있는 것에만. e1 카드, e3 FAB, e4 플로팅.</li>
          <li>
            감정, 관계 태그 색은 per-chip hex 동적 칩. 고정 enum 색으로 회귀
            금지.
          </li>
        </ul>
      </Section>

      <Section title="금지">
        <ul className="text-label list-disc space-y-1 pl-5">
          <li>800/900 weight, 세리프, 그라데이션 표면, 네온 포커스</li>
          <li>데이터 없는 섹션을 꾸며 렌더하는 것</li>
          <li>시맨틱 층을 거치지 않은 원시 색 직접 사용</li>
        </ul>
      </Section>

      <Section title="스토리북 테마 전환">
        <p className="text-label max-w-135">
          툴바의 테마 전환(라이트/다크)은 앱 ThemeProvider와 같은 기전으로
          documentElement에 .dark 클래스를 토글한다. 시맨틱 토큰만 뒤집히고
          primitive는 그대로므로, 전환 후에도 램프 스와치는 변하지 않아야
          정상이다.
        </p>
      </Section>
    </div>
  ),
}
