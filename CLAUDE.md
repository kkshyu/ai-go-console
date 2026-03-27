# AI Go Console

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
