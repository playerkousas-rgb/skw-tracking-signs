# SKW 追蹤符號追蹤訓練 APP

**COPYRIGHT © 2026 SCOUT SYSTEM · SKW TRACKING**

合併三個版本所長（取長補短）的手機友善童軍追蹤符號訓練工具。

> 🐾 **這是追蹤（Tracking），不是尋寶** —
> 地圖只讓隊員知道**自己在哪**（防止迷路）；下一個符號在哪**不會預先顯示**，
> 要靠隊員沿途觀察地面追蹤符號，**行到觸發**後才會標示在地圖上。

## 版本合併：取長補短

| 來源 | 取其所長 |
|---|---|
| `skw-tracking-signs` | 10 種官方追蹤符號圖鑑（天然材料 SVG 畫風）、符號判斷題、路線分享（QR／代碼）、防迷路安全點 |
| `skw-tracking-signs2` | GPS 接近觸發符號、「走到哪放到哪」實地放置、音效提示、觸發半徑設定 |
| `skw_tracking_signs`（v5.2 HTML） | 廣東話語音導航、陷阱符號自由觸發、GPS 準確度警告、震動提示 |

## 核心玩法：成功運用追蹤符號完成任務

1. **領袖**建立任務：按順序排符號（可設箭頭方向、步數、隱藏信物）
2. 有 GPS 錨點的符號 → **實地追蹤**：走到哪放到哪，隊員行近自動觸發
3. 警告類符號可設為**陷阱** — 不按順序，行近即彈出警告（錯路／危險／分岔）
4. 隊員發現符號後要答對「**應對行動**」— 答對才算成功運用符號
5. 跟隨指示前進，直到「已回家」🎯

## 🗺 定位地圖的設計原則（防迷路 ≠ 尋寶）

| 顯示 ✅ | 不顯示 ❌ |
|---|---|
| 你的即時位置（脈衝點＋準確度圈，防迷路） | 下一個符號在哪（**絕不**預先顯示） |
| 已觸發的符號（走過的痕跡，金框＝最新） | 距離／方向提示（沒有冷熱感應，那是尋寶） |
| 走過的路線（虛線麵包屑） | |
| 安全集合點 SAFE | |

- 符號**行到觸發距離內才會出現在地圖上** — 玩家要自己沿途觀察地面找到為止
- 雷達式「接近提示」已刻意移除：訊號強弱會令追蹤變質成尋寶熱冷遊戲

## 📡 GPS 準確度加強

- `enableHighAccuracy` ＋ `maximumAge: 0`（絕不用舊快取定位）＋ 短逾時重試
- **準確度門檻**：誤差 > 30m 的定位只更新地圖，不用作符號觸發判決（防誤觸）
- GPS 品質即時顯示：優（≤10m）／良（≤20m）／可（≤30m）／弱（>30m 警告閃爍）
- 地圖如實畫出誤差圈，讓隊員知道自己定位的可信度

## ⏱ 計時及倒計時模式（新）

| 模式 | 說明 |
|---|---|
| **⏱ 計時模式** | 時間向上計，完成後記錄用時，可挑戰路線**最佳時間** 🏅 |
| **⏳ 倒計時模式** | 領袖設定限時（分鐘）；時間歸零任務即失敗。最後 60 秒語音警告，最後 10 秒滴答提示 |

- 任務簡報顯示模式與最佳時間
- 完成畫面顯示用時、符號判斷成績、是否新最佳時間
- 領袖路線列表顯示 🏅 最佳時間紀錄

## 📱 手機友善設計

- 底部導覽列、大按鈕（≥44px 觸控目標）、safe-area 劉海支援
- 定位地圖自動跟隨移動，拖動即停跟隨；一鍵「回到我的位置」📱
- 網頁震動提示（`navigator.vibrate`）、Web Audio 音效（無需檔案）
- 廣東話語音導航（`speechSynthesis` zh-HK，可開關 🔊／🔇）
- GPS 訊號微弱時閃爍警告（準確度 > 25m）
- 全部資料存 localStorage（離線可用），72 小時自動清除

## 頁面

| 頁面 | 功能 |
|---|---|
| 首頁 | 模式總覽、追蹤 ≠ 看地圖提示 |
| 符號圖鑑 | 10 種符號：分類、搜尋、意思及應對動作 |
| 設計任務 | 領袖建路線：符號順序＋GPS 錨點＋陷阱＋計時模式＋觸發距離＋安全點 |
| 沿途追蹤 | 輸入代碼／掃 QR → 任務簡報 → 追蹤儀 → 完成成績 |

## 技術棧

- React 19 + TypeScript + Vite 7
- Tailwind CSS v4、Framer Motion、Lucide Icons
- Leaflet（**只**用於領袖端設定安全點 — 隊員端全程無地圖）
- qrcode（路線分享）

## 本地開發

```bash
npm install
npm run dev
```

## 構建與驗證

```bash
npm run build      # tsc -b && vite build（產出 dist/）
npm run typecheck  # 只做 TypeScript 型別檢查
npm run lint       # ESLint
npm run check      # 型別檢查 + ESLint 一次過
```

## 部署到 Vercel

1. Fork 或 Clone 此項目到你的 GitHub
2. 在 Vercel 中導入 GitHub 項目
3. 自動部署完成（`vercel.json` 已固定設定，無需手動填寫）

### 部署設定說明

| 檔案 | 作用 |
|---|---|
| `vercel.json` | 固定 `installCommand: npm ci`、`buildCommand: npm run build`、`outputDirectory: dist`；`rewrites` 把深連結導回 `index.html`（本專案用 `BrowserRouter`，缺了它 `/leader`、`/play/:trailId` 重新整理會 404） |
| `.vercelignore` | CLI 部署（`vercel deploy`）時不上傳：`node_modules`、`dist`、建置快取、`*.bak`/`*.tmp`/`*.old`/`*.log`、`uploads/`、環境檔 |
| `.gitignore` | Git 整合部署時同樣排除上述項目，`dist/` **不入版本控制**（由遠端建置產生） |

> ⚠️ 改任何設定前，先讀下面「🧹 防增肥守則」。

---

## 🧹 防增肥守則（改版前必讀，勿刪）

> 本專案曾把 `dist/` commit 進 git，光這一項就佔掉全部追蹤內容的 **67.5%（754.8 KB）**。
> 2026-09 已清理（commit `9a399ef`）：追蹤內容由 **37 檔 / 1,118.7 KB** 降到 **31 檔 / 307.2 KB（−72.5%）**。
> 那是當時的數字，**現在的即時數字請用第 5 節的指令自己跑**。
> 以下是防止復胖的硬性規則。**新增目錄、新增套件、新增素材之前，先對照這張表。**

### 1. 絕對不准 commit 的東西

| 項目 | 為什麼 | 由誰把關 |
|---|---|---|
| `dist/` | 建置產物，Vercel 遠端會自己 `npm run build` 產生；commit 等於同一份內容存兩次 | `.gitignore` |
| `node_modules/` | 本機 200 MB，Vercel 用 `npm ci` 自行安裝 | `.gitignore` + `.vercelignore` |
| `*.bak` `*.tmp` `*.old` `*.orig` `*.log` | 開發過程死重 | `.gitignore` + `.vercelignore` |
| `uploads/` `tmp/` `temp/` | 測試上傳資料 | `.gitignore` + `.vercelignore` |
| `.env` `.env.*` `*.local` | 環境檔（含機密） | `.gitignore` + `.vercelignore` |
| `.DS_Store` `*.tsbuildinfo` `.vite/` `.cache/` | 系統／快取殘留 | `.gitignore` + `.vercelignore` |

**新增任何工具或產物目錄時，`.gitignore` 與 `.vercelignore` 要「兩個都加」**
（前者管 Git 整合部署，後者管 `vercel deploy` CLI 上傳，缺一條就會漏）。

### 2. `dependencies` vs `devDependencies`

- `dependencies` **只放瀏覽器執行期真的會 import 的套件**。目前僅 8 個：
  `react`、`react-dom`、`react-router-dom`、`framer-motion`、`lucide-react`、`leaflet`、`react-leaflet`、`qrcode`。
- **建置工具一律放 `devDependencies`**：`vite`、`@vitejs/plugin-react`、`tailwindcss`、`@tailwindcss/vite`、`typescript`、`eslint*`、以及所有 `@types/*`。
- 新裝套件前先問三句：
  1. 執行期真的需要嗎？（純建置用 → `devDependencies`）
  2. 現有套件能不能做到？（例：圖示已有 `lucide-react`，不要再裝第二套 icon 庫）
  3. 體積多少？（`npm i` 後看 `du -sh node_modules`，以及 build 後的 `dist/assets/*.js` gzip 大小）
- 裝完執行 `npm run build`，把新的 gzip 數字記進 PR 描述，體積明顯上升要說明原因。

### 3. 靜態素材

- `public/` 下每個檔案都要**能在 code 裡 grep 到引用**，否則就是死重。
  檢查方式：`grep -rn "檔名" src/ index.html`。
- 大圖（截圖、設計原稿、展示圖）**不要進 repo**，放外部圖床或 issue 附件。
- 素材用完即刪，不要「先留著」。

### 4. ⚠️ Tailwind v4 的 `.gitignore` 陷阱（踩過，別再踩）

**Tailwind v4 的自動來源掃描會遵守 `.gitignore`。**
以前 `dist/` 沒被忽略，Tailwind 把舊建置產物當原始碼掃，多吐了 11 個沒在用的
utility（`container`、`sticky`、`italic`、`ring`…），CSS 虛胖 1.36 kB。
反過來說：**如果你把某個含 class 的檔案加進 `.gitignore`，Tailwind 就不會再掃描它**，
樣式可能無聲消失。改 `.gitignore` 後務必 `npm run build` 並比對 CSS 大小。

### 5. 合併前檢查清單（複製這一段到 PR 描述逐項打勾）

```
[ ] git status 乾淨，且 git ls-files 沒有 dist/、node_modules/、*.bak、*.log、uploads/
[ ] git ls-files | wc -l 與追蹤內容大小沒有無理由上升
[ ] 新增套件已確認歸類正確（建置工具在 devDependencies）
[ ] public/ 新增的每個檔案都能在 src/ 或 index.html grep 到引用
[ ] npm ci 成功（Vercel 用的就是這條）
[ ] npm run build 通過（exit 0）
[ ] npm run check 通過，或新增的 error 已在 PR 說明
[ ] 新增的目錄已同時加入 .gitignore 與 .vercelignore
```

一行版自查：

```bash
git ls-files -z | xargs -0 stat -c '%s' | awk '{s+=$1;n++} END {printf "%d files, %.1f KB\n", n, s/1024}'
git ls-files | grep -E '^(dist/|node_modules/)|\.(bak|tmp|old|log)$' && echo '❌ 有死重' || echo '✅ 無死重'
```

### 6. 尚未解決、已知的事

- `.git/` 內仍留著舊 `dist/` 的歷史 blob（約 540 KB）。停止追蹤只保證**未來**的
  checkout 與上傳包乾淨；要回收歷史體積需 `git filter-repo` 改寫歷史 + force push，
  屬破壞性操作，需另行決議。
- `npm run lint` 目前有 **6 個既有 error**（`react-hooks` 系列 5 個、`no-unused-vars` 1 個），
  位於 `Confetti.tsx`、`SignSVG.tsx`、`LeaderCreatePage.tsx`、`PlayerPage.tsx`、`TrailWalkPage.tsx`。
  這些是清理之前就存在的，修它們會動到執行期 effect 邏輯，尚未處理。

---

**COPYRIGHT © 2026 SCOUT SYSTEM. ALL RIGHTS RESERVED.**
