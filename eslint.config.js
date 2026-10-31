import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // react-hooks v7 嘅兩個新規則同本專案嘅「命令式相機 + 感測器」寫法有衝突：
      // · refs：MediaStream / <video> 嘅 ref 係刻意由 useCamera 傳落子元件
      // · set-state-in-effect：GPS、指南針、陷阱偵測都係外部系統，effect 內同步狀態係正確做法
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
