import type { Preview } from '@storybook/react-vite'
import { useEffect } from 'react'
import '../src/styles.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: '테마 (디자인 시스템 결의 light/dark)',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: '라이트' },
          { value: 'dark', title: '다크' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    // 앱 ThemeProvider와 같은 기전: documentElement의 .dark 클래스로
    // 시맨틱 토큰(styles/semantic.css)을 반전한다.
    (Story, context) => {
      const theme = context.globals.theme
      useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        return () => {
          document.documentElement.classList.remove('dark')
        }
      }, [theme])
      return <Story />
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
}

export default preview
