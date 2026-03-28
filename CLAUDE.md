# AI Go Console

## AI 啟動 SOP（快速上手）

AI agent 首次進入此專案時，依照以下步驟啟動環境：

### 一鍵啟動

```bash
bash scripts/setup.sh
```

此腳本會自動完成以下所有步驟。若需手動執行或排錯，參考下方逐步說明。

### 逐步啟動流程

| 步驟 | 指令 | 說明 |
|------|------|------|
| 1. 環境變數 | `ln -s /path/to/main/.env.local .env.local` | Worktree 需 symlink 主專案的 .env.local |
| 2. 基礎服務 | `bash scripts/k3d-setup.sh` | 啟動 k3d 叢集（PostgreSQL, Redis, Traefik） |
| 3. 等待 DB | `kubectl port-forward svc/postgres 5432:5432 -n aigo-system &` | 確認 PostgreSQL 可連線 |
| 4. 安裝依賴 | `pnpm install` | 必須使用 pnpm，不可用 npm/yarn |
| 5. DB 遷移 | `npx prisma migrate deploy` | 套用 schema 至資料庫 |
| 6. Prisma Client | `npx prisma generate` | 產生 Prisma Client |
| 7. Seed 資料 | `npx prisma db seed` | 建立測試帳號與服務資料 |
| 8. 啟動 Dev Server | `pnpm dev` 或 `preview_start ai-go-console` | Next.js + Turbopack，port 3000 |

### 常見問題排錯

| 問題 | 解法 |
|------|------|
| `.env.local` 不存在 | 從主專案 `ln -s` 建立 symlink |
| PostgreSQL 連不上 | `kubectl port-forward svc/postgres 5432:5432 -n aigo-system &` |
| k3d 叢集未啟動 | `k3d cluster start aigo` |
| Pod 未就緒 | `kubectl get pods -n aigo-system` 查看狀態 |
| Prisma Client 錯誤 | `npx prisma generate` |
| Seed 重複執行失敗 | 可忽略，或 `npx prisma migrate reset --force` 重置 |
| Port 3000 被佔用 | launch.json 已設定 `autoPort: true`，會自動換 port |

---

## 套件管理

本專案使用 **pnpm** 作為套件管理工具。所有安裝、新增、移除套件的操作皆須使用 `pnpm`（例如 `pnpm install`、`pnpm add`），不要使用 npm 或 yarn。

## Worktree 環境設定

使用 worktree 開發時，須確保環境正確：

1. **自動建立 `.env.local` symbolic link**：若 worktree 中不存在 `.env.local`，自動從主專案建立 symbolic link（`ln -s`），確保環境變數可用。
2. **使用 pnpm 安裝依賴**：在 worktree 中執行 `pnpm install` 安裝套件，確保 dev server 可正常啟動。

## 驗證流程 — 使用 Seed 測試帳號登入

每次需求開發完成後，必須透過 preview 工具啟動 dev server，使用 seed 資料中的測試帳號登入，驗證新功能是否正常運作。

### Seed 測試帳號

| Email | Password | Role | Organization |
|---|---|---|---|
| admin@example.com | password123 | admin | Acme Corp |
| alice@example.com | password123 | user | Acme Corp |
| bob@example.com | password123 | admin | Cool Startup |

依據功能需求選擇適當的帳號：
- 需要 admin 權限：使用 `admin@example.com`
- 需要一般使用者視角：使用 `alice@example.com`
- 需要跨組織驗證：使用 `bob@example.com`

### 驗證步驟

1. **確認環境就緒**
   - 若在 worktree 中，先確認 `.env.local` 存在（不存在則從主專案複製）
   - 確認資料庫已有 seed 資料：`npx prisma db seed`

2. **啟動 Dev Server**
   - 使用 `preview_start` 啟動 `ai-go-console`

3. **登入驗證**
   - `preview_eval`: `window.location.href = '/login'`
   - `preview_snapshot` 確認登入頁面已載入
   - `preview_fill` 填入測試帳號 email 和 password
   - `preview_click` 點擊登入按鈕
   - `preview_snapshot` 確認成功跳轉到 Dashboard

4. **功能驗證**
   - `preview_snapshot` 檢查頁面內容與結構
   - `preview_click` / `preview_fill` 測試互動功能
   - `preview_console_logs` 檢查是否有 JS 錯誤
   - `preview_network` 檢查 API 請求是否正常（特別注意 failed requests）
   - `preview_screenshot` 截圖作為驗證證據

5. **回報結果**
   - 登入是否成功
   - 功能是否正常運作
   - 是否有 console error 或 network error
   - 附上 screenshot 作為證據
