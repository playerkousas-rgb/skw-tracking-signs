# SKW 追蹤符號 · 虛擬符號 AR 追蹤

**COPYRIGHT © 2026 SCOUT SYSTEM · SKW TRACKING**

手機優先的童軍追蹤訓練工具。**符號唔喺地上 —— 係領袖喺現場放低嘅虛擬記號，隊員行到、舉機，先會透過相機見到。**

> 🐾 **這是追蹤（Tracking），不是尋寶**
> 隊員全程唔會預先見到下一個符號嘅位置、距離或方向。
> 只有行到觸發半徑、舉起手機望向正確方向，虛擬符號先會喺相機畫面浮現。

---

## 操作流程：領袖點「畫」、成員點「讀」

### 領袖（放置虛擬符號）

| 步 | 做乜 | 畫面 |
|---|---|---|
| 1 | 喺「設計路線」排好符號序列（10 種標準童軍符號，唔使手畫） | 每張符號卡都有**實物畫法**：用幾多根樹枝、點排 |
| 2 | 儲存 → 自動進入 **`/leader/place/:trailId` 現場放置模式** | 進度條 + 「第 2 / 5 站」 |
| 3 | 行到該站，企定，撳「開相機放置」 | HUD 顯示 GPS 精度、方位、地面預覽 |
| 4 | 手機指向隊員行過嚟嘅方向，撳「喺呢度放低符號」 | 自動記錄 `lat / lng / bearing`，跳去下一站 |

> 領袖**唔需要畫圖**：符號形狀係標準化嘅；領袖做嘅係「行去邊、放邊個符號、面向邊個方向」。
> 「實物畫法」係教學參考（如果同時想擺實物符號，照住排就得），亦保證虛擬符號同童軍教材一致。

### 成員（讀取地面符號）

| 步 | 做乜 | 畫面 |
|---|---|---|
| 1 | 匯入 JSON／掃 QR | 任務簡報：站數、AR 錨定數、陷阱數 |
| 2 | 跟住上一個符號嘅指示行 | 只有文字指示，冇地圖、冇距離、冇方向 |
| 3 | 入到觸發半徑 → 撳「舉機觀察」 | 相機 HUD + 羅盤帶 |
| 4 | **俯低手機、望住地面、慢慢左右掃** | 見到好淡嘅粉筆虛線輪廓 |
| 5 | 保持對準 | 輪廓實體化 → 掃描環填滿 → 自動讀取 |
| 6 | 答對「正確應對」 | 顯示隱藏訊息，繼續下一站 |

## 核心玩法（v6）

| 角色 | 做乜 |
|---|---|
| **領袖** | 排好符號序列 → 行一次路線 → 喺每個位置開相機「放低」虛擬符號（記 GPS＋方位）→ 匯出 JSON／QR |
| **隊員** | 匯入路線 → 跟住上一個記號嘅指示行 → 入到觸發半徑 → 舉機 → 符號浮現 → 答對「正確應對」→ 繼續 |

1. **虛擬符號，實地錨定** — 符號存在於 GPS 座標，冇實物、冇預先提示
2. **相機係眼睛** — 用方位／俯仰／距離投影到相機畫面，似現場全息投影
3. **AR 鎖定** — 要將中央準星對準符號約 0.85 秒，先「鎖定」讀取
4. **判斷題** — 發現符號後要答對「應對行動」，答對先算成功運用
5. **陷阱符號** — 警告類記號可設為陷阱，行近即彈全螢幕警告
6. **計時／倒計時** — 可設限時，完成後記錄用時同最佳時間 🏅

---

## 📷 相機多維功能

| 功能 | 狀態 | 說明 |
|---|---|---|
| 虛擬符號 AR 投影 | ✅ | 方位 + 俯仰 + 距離 → 畫面座標，唔用 WebXR，iOS Safari 都用得 |
| 相機放置符號 | ✅ | 領袖企喺現場，HUD 顯示 GPS 精度／方位，一按錨定 |
| 指南針帶 + 方位角 | ✅ | 頂部 5° 刻度羅盤帶，中央紅色準線 |
| 水平儀 | ✅ | 十字準星下方氣泡，綠色＝水平 |
| 電筒 | ✅ 部分裝置 | 有 `torch` capability 先顯示按鈕（iOS Safari 多數唔支援） |
| 變焦 | ✅ 部分裝置 | 讀 `zoom` capability，冇就唔顯示 |
| 夜視 | ✅ | CSS 濾鏡（降飽和、提亮、色相偏移） |
| QR 掃描 | ✅ | 原生 `BarcodeDetector`，唔支援就用 `jsQR` |
| 模擬視野 | ✅ | 冇鏡頭／拒絕權限時仍然可以示範同測試 |

**私隱**：所有影像只喺本機處理，唔會上傳、唔會儲存影片。

### 半 VR：要「望住塊地」先算找到

童軍追蹤符號係**畫喺地面**嘅。所以虛擬符號一律錨定喺地面（`heightM = 0`），並用透視壓扁 + 接觸陰影，令佢似貼喺泥地而唔係浮喺半空。

隊員唔係行到就自動見到：

1. 進入觸發半徑（可設 3–25 m）先會出現「舉機觀察」按鈕
2. 開鏡頭後，符號只會喺**正確方位**出現（唔會提示你轉左定轉右）
3. 中央準星要同時滿足：水平方位差 **< 8°**、垂直偏差 **< 18%** 畫面高
4. 保持對準，符號會**由粉筆痕逐漸實體化** —— 唔係一彈就出
5. 掃描環填滿（約 1.3 秒）→「已鎖定」→ 再保持 0.95 秒自動讀取
6. 一移開視線，浮現度會快速倒退（0.45 秒內歸零）

### 為什麼「不停跑」唔會觸發？

| 防護 | 實作 |
|---|---|
| 唔會自動開鏡頭 | 必須手動按「舉機觀察」 |
| 跑緊唔計掃描 | 讀 GPS `coords.speed`，> 1.2 m/s 時掃描進度只會倒退 |
| 掃描要對準 | 水平 8° + 垂直 18% 雙軸容差 |
| 要望住塊地 | 地面符號投影在地平線以下，唔望向地面就對唔到 |
| 一閃即過唔算 | 浮現度要維持約 1.3 秒，跑過只會見到一下粉筆痕 |
| 走開會消失 | 進度 < 0.35 自動解除鎖定 |

### AR 投影原理（`src/lib/geo.ts`）

```
橫向：relBearing = 目標方位 − 裝置朝向
      x% = 50 + relBearing / (hFov/2) × 50

縱向：仰角 = −atan(眼高 / 距離)      （地面點永遠喺地平線以下）
      y% = 50 − (仰角 − 相機俯仰) / (vFov/2) × 50

大小：scale = 4.2 / 距離（clamp 0.42–2.1）
```

- 眼高預設 1.5 m、橫向視角預設 62°、直向比例 1.78
- 裝置朝向：iOS 用 `webkitCompassHeading`，Android 用 `deviceorientationabsolute` 嘅 alpha
- 冇指南針時會退化為「符號置中」，並提供手動確認，唔會卡死

---

## 🗂 JSON 分享

領袖可以：

- 掃／貼／開檔案匯入
- 複製完整 JSON
- 下載 `.json` 檔
- 用系統分享（Web Share API，支援檔案就直接分享 JSON）
- 產生 QR（內含壓縮後嘅路線連結）

格式（節錄）：

```json
{
  "app": "skw-tracking-signs",
  "v": 6,
  "id": "SKW-OAK24",
  "name": "大棠樹林追蹤線",
  "settings": {
    "triggerDistance": 8,
    "timerMode": "countdown",
    "timeLimitMin": 20,
    "quizMode": true,
    "arMode": true
  },
  "steps": [
    { "signId": 1, "direction": "right", "lat": 22.4231, "lng": 114.0192, "bearing": 78 },
    { "signId": 9, "paces": 12, "hiddenContent": "大樹下紅色盒", "lat": 22.4236, "lng": 114.0197, "bearing": 92 },
    { "signId": 4, "lat": 22.4244, "lng": 114.0205, "bearing": 60 }
  ]
}
```

> ⚠️ JSON 內含符號 GPS 座標，只應分享俾自己隊員。

---

## 頁面

| 頁面 | 內容 |
|---|---|
| `/` 營地 | 玩法總覽、三件工具、追蹤≠尋寶原則 |
| `/learn` 圖鑑 | 10 種官方符號、分類／搜尋、意思＋正確應對 |
| `/leader` 領袖 | 路線列表、分享（QR／JSON／連結）、成績統計 |
| `/leader/create` 設計 | 符號序列、任務設定、安全點（儲存後直入放置模式） |
| `/leader/place/:id` 放置 | **逐站現場放置**：進度條、實物畫法、GPS／方位、放低即跳下一站 |
| `/player` 追蹤 | 掃 QR／貼 JSON／開檔案匯入路線 |
| `/play/:trailId` 任務 | 簡報 → 追蹤 → 相機觀測 → 判斷題 → 成績 |

---

## 📱 手機設計

- 紙張質感 + 森林綠 + 營火橙的「野外筆記」視覺，深色只用喺相機 HUD
- 底部四鍵導覽、≥44px 觸控目標、`viewport-fit=cover` ＋ safe-area
- PWA manifest：可「加到主畫面」，直向鎖定
- 震動（`navigator.vibrate`）＋ Web Audio 音效（無檔案）＋ 廣東話語音導航
- 全部資料存 `localStorage`，72 小時自動清除

---

## 技術棧

- React 19 + TypeScript + Vite 7
- Tailwind CSS v4、Framer Motion、Lucide Icons
- `qrcode`（產生 QR）、`jsqr`（QR 解碼後備）
- 無 3D／AR 引擎、無地圖依賴 — AR 用純數學投影

```bash
npm install
npm run dev
```

### 構建與驗證

```bash
npm run build      # tsc -b && vite build
npm run typecheck  # 只做型別檢查
npm run lint       # ESLint
npm run check      # 兩樣一齊
```

**注意**：相機同指南針需要 **HTTPS**（或 localhost）。用 Vercel 部署即自動有 HTTPS；區網 IP 測試會攞唔到鏡頭。

---

## 部署到 Vercel

1. Fork / Clone 到 GitHub
2. Vercel 匯入項目，自動部署（`vercel.json` 已固定設定）

| 檔案 | 作用 |
|---|---|
| `vercel.json` | `installCommand: npm ci`、`buildCommand: npm run build`、`outputDirectory: dist`；`rewrites` 把深連結導回 `index.html`（BrowserRouter 必需） |
| `.vercelignore` | CLI 部署唔上傳 `node_modules`、`dist`、快取、`*.bak` 等 |
| `.gitignore` | Git 部署同樣排除；`dist/` **不入版本控制** |

---

## 🧹 防增肥守則（改版前必讀）

### 1. 絕對不准 commit 的東西

| 項目 | 為什麼 | 由誰把關 |
|---|---|---|
| `dist/` | 建置產物，Vercel 遠端自己 build | `.gitignore` |
| `node_modules/` | 本機 200 MB | `.gitignore` + `.vercelignore` |
| `*.bak` `*.tmp` `*.old` `*.orig` `*.log` | 開發過程死重 | `.gitignore` + `.vercelignore` |
| `uploads/` `tmp/` `temp/` | 測試上傳資料 | `.gitignore` + `.vercelignore` |
| `.env` `.env.*` `*.local` | 環境檔（含機密） | `.gitignore` + `.vercelignore` |
| `.DS_Store` `*.tsbuildinfo` `.vite/` `.cache/` | 系統／快取殘留 | `.gitignore` + `.vercelignore` |

**新增任何工具或產物目錄時，`.gitignore` 與 `.vercelignore` 要「兩個都加」。**

### 2. `dependencies` vs `devDependencies`

- `dependencies` 只放瀏覽器執行期真的會 import 的套件。目前 8 個：
  `react`、`react-dom`、`react-router-dom`、`framer-motion`、`lucide-react`、`qrcode`、`jsqr`、`@vercel/analytics`。
- 建置工具一律 `devDependencies`。
- 新套件前三問：執行期真的需要？現有套件做到？體積幾多？

### 3. 靜態素材

- `public/` 每個檔案都要 grep 到引用（`icon.svg`、`manifest.webmanifest` 喺 `index.html` 引用）。
- 大圖唔入 repo。

### 4. ⚠️ Tailwind v4 的 `.gitignore` 陷阱

Tailwind v4 自動來源掃描會遵守 `.gitignore`。把含 class 嘅檔案加進 `.gitignore`，樣式會無聲消失。改完請 `npm run build` 比較 CSS 大小。

### 5. ⚠️ `vercel.json` 鍵名陷阱

`vercel.json` 頂層 `additionalProperties: false` —— 錯一個鍵名整個部署即刻 fail。目前只用：
`$schema`、`framework`、`installCommand`、`buildCommand`、`outputDirectory`、`rewrites`。

### 6. 合併前檢查清單

```
[ ] git status 乾淨；git ls-files 冇 dist/、node_modules/、*.bak、*.log
[ ] 新增套件歸類正確
[ ] public/ 新檔案都 grep 到引用
[ ] npm ci 成功
[ ] npm run build 通過
[ ] npm run check 通過（或新增 error 已說明）
[ ] 新目錄已同時加入 .gitignore 同 .vercelignore
[ ] PR 的 Vercel check pass
[ ] 部署後實測深連結：/leader、/play/:trailId 重新整理不 404
[ ] 手機實測：相機權限、指南針、AR 鎖定、QR 掃描
```

### 7. 已知事項

- `dist/assets/*.js` 主 chunk 約 78 KB gzip；頁面已用 `React.lazy` 分割。
- ESLint 0 error、5 個 warning，全部係 `react-hooks/set-state-in-effect`（GPS／指南針／陷阱偵測同步屬刻意設計）。
- ⚠️ 真機相機／指南針／電筒未能喺本機沙盒驗證（冇鏡頭），已用模擬視野同 SSR 煙霧測試覆蓋其餘流程。
- 舊 v5 路線會自動遷移到 `skw_trails_v6`（保留座標，新增 `bearing` 留空）。

---

**COPYRIGHT © 2026 SCOUT SYSTEM. ALL RIGHTS RESERVED.**
