# AI Go Console — 完整測試流程

本文件用於描述 AI Go Console 的端對端測試流程，讓 AI agent 在任何時間點都能獨立執行完整的功能驗證，無需人工介入說明步驟。

---

## 環境前置條件

在開始測試前，確認以下服務已就緒：

```bash
# 確認 k3d 叢集運行
kubectl get nodes

# 確認核心 Pod 就緒
kubectl get pods -n aigo-system

# 確認 DB 可連線（如需 port-forward）
kubectl port-forward svc/postgres 5432:5432 -n aigo-system &

# 確認 Next.js dev server 已啟動
# 使用 preview_start ai-go-console，或確認 port 3000 有服務
```

### Seed 測試帳號

| Email | Password | Role | Organization |
|---|---|---|---|
| admin@example.com | password123 | admin | AI Go |
| alice@example.com | password123 | user | AI Go |
| bob@example.com | password123 | admin | Cool Startup |

---

## 測試流程：應用程式建立完整流程

### Step 1：登入

**操作：**
```
preview_eval: window.location.href = '/login'
preview_snapshot → 確認登入頁面已載入（含 email/password 欄位）
preview_fill: [name="email"] → admin@example.com
preview_fill: [name="password"] → password123
preview_click: [type="submit"] 登入按鈕
preview_snapshot → 確認跳轉至 Dashboard（URL 應為 / 或 /apps）
```

**驗證標準：**
- [ ] URL 不再是 `/login`
- [ ] 頁面顯示應用程式列表或歡迎畫面
- [ ] 無 console error

---

### Step 2：建立新應用

**操作：**
```
preview_click: 側欄「建立應用」按鈕（通常有 + 圖示）
preview_snapshot → 確認進入 /create 頁面或建立應用 modal
preview_click: 「銷售 CRM」preset 卡片
```

**驗證標準：**
- [ ] 成功點擊 preset 後跳轉至 `/apps/[appId]` 頁面
- [ ] URL 包含有效的 appId（UUID 格式）
- [ ] 頁面左側出現 Agent Chat Panel

**技術說明：**
- 點擊 preset 後觸發 `POST /api/apps`，body 含 `{ presetId: "internal-project", ... }`
- 後端執行 `generateApp()` → 建立 k8s Pod + 寫入範本檔案
- 應用初始 status 為 `developing`

---

### Step 3：Agent Chat 完成對話並建立應用

**操作：**
```
preview_snapshot → 確認 chat panel 已有訊息（AI 開始自動對話）
# 等待 agent 完成工作（可能需要 60-120 秒）
preview_snapshot → 確認對話完成（最後訊息不是 loading 狀態）
```

**驗證標準：**
- [ ] Chat panel 顯示多輪對話（PM → Developer 等 agent 角色）
- [ ] 對話中出現 agent 角色切換提示（如 "architect", "developer"）
- [ ] 對話結束後不再有 loading spinner
- [ ] 右側檔案管理員出現應用程式檔案
- [ ] 右側預覽出現網頁內容

**技術說明：**
- Chat 透過 `POST /api/chat/multi-agent` SSE 串流
- PM Actor 協調 Architect、Developer 等 agent 依序完成任務
- 檔案寫入透過 `POST /api/apps/[appId]/files`（k8s exec tar）
- Agent roles: pm（藍）、architect（紫）、developer（綠）、reviewer（琥珀）

---

### Step 4：右側檔案管理員有應用程式檔案

**操作：**
```
preview_snapshot → 確認右側面板的檔案管理員
# 若預設顯示 browser preview，切換到 Files tab
preview_click: Files tab（如有）
preview_snapshot → 確認檔案樹狀結構
```

**驗證標準：**
- [ ] 檔案管理員顯示非空的目錄結構
- [ ] 至少含有 `src/`, `package.json` 等 Next.js 專案標準檔案
- [ ] 專案任務看板應含 `src/app/page.tsx`, `src/app/projects/page.tsx` 等

**技術說明：**
- 檔案列表透過 `GET /api/apps/[appId]/files` 取得
- 底層用 k8s exec 在 Pod 內執行 `find /app` 列出檔案
- 若 Pod 未就緒（CrashLoopBackOff），此步驟會失敗

---

### Step 5：開發環境啟動按鈕狀態

**在應用建立完成前：**
```
# 應用建立過程中（status = "developing"）
preview_snapshot → 確認開發環境啟動按鈕為 disabled 狀態
```

**在應用建立完成後（自動啟動）：**
```
# 等待 app status 變為 running（自動輪詢）
preview_snapshot → 確認開發環境已自動啟動
# 右側應顯示 browser preview iframe（而非啟動按鈕）
```

**驗證標準：**
- [ ] 建立中：按鈕 disabled，不可點擊
- [ ] 建立完成：自動啟動，顯示 browser preview 而非按鈕
- [ ] preview iframe 載入成功（專案任務看板 UI 顯示）

**技術說明：**
- 頁面每 3 秒輪詢 `POST /api/apps/[appId]/lifecycle { action: "dev-status" }`
- `getDevServerStatus()` 查詢 k8s Pod phase 判斷是否 running
- Pod running → `setDevRunning(true)` → 顯示 preview iframe

---

### Step 6：日誌不含 warning 或 error

**操作：**
```
preview_click: 下方 Logs tab
preview_snapshot → 查看日誌內容
preview_console_logs → 確認 browser console 無錯誤
```

**驗證標準：**
- [ ] Logs panel 顯示 Next.js 正常啟動訊息（`✓ Ready in ...ms`）
- [ ] 無 swc 相關 warning（`Found lockfile missing swc dependencies` 等已過濾）
- [ ] 無 telemetry 相關訊息（已過濾）
- [ ] 無 `error` 或 `Error` 字樣的非預期訊息
- [ ] Browser console 無 JS 錯誤

**已知過濾的訊息（不應顯示）：**
- `Found lockfile missing swc dependencies`
- `Lockfile was successfully patched`
- `Attention: Next.js now collects completely anonymous telemetry`
- `Waiting for app files...` / `App files detected.`
- `Restoring cached node_modules...` / `Installing dependencies...`
- `packages are looking for funding` / `found 0 vulnerabilities`

---

## 驗證截圖要求

每個 Step 完成後執行：
```
preview_screenshot → 作為驗證證據
```

最終結果彙整：
1. 登入成功截圖
2. 建立應用頁面截圖
3. Agent chat 完成截圖（含多 agent 對話）
4. 檔案管理員截圖（含 Next.js 檔案結構）
5. Dev server 啟動後的 browser preview 截圖
6. 日誌面板截圖（乾淨，無 warning/error）

---

## 常見問題快速診斷

| 症狀 | 診斷指令 | 可能原因 |
|---|---|---|
| 檔案管理員空白 | `kubectl get pods -n aigo-dev` | Pod CrashLoopBackOff |
| Dev server 未自動啟動 | `preview_network` 看 dev-status 回應 | Pod 未 running |
| 日誌出現大量 warning | `preview_snapshot` 看 logs panel | 過濾規則未套用 |
| Agent chat 無回應 | `preview_network` 看 multi-agent 請求 | LLM API 連線問題 |
| Preview iframe 空白 | 檢查 k8s ingress 與 dev service | Service / ingress 未建立 |

---

## 關鍵程式碼路徑

| 功能 | 檔案 |
|---|---|
| 應用程式詳情頁 | `src/app/(console)/apps/[appId]/page.tsx` |
| Lifecycle API | `src/app/api/apps/[appId]/lifecycle/route.ts` |
| Dev server 控制 | `src/lib/dev-server.ts` |
| K8s sandbox 操作 | `src/lib/k8s/sandbox.ts` |
| Pod manifest 產生 | `src/lib/k8s/manifests.ts` |
| 應用程式產生器 | `src/lib/generator.ts` |
| PM Actor | `src/lib/actors/pm-actor.ts` |
| 專案任務看板 Preset | `src/lib/presets/internal/project.ts` |
| Dev container Dockerfile | `templates/nextjs-fullstack/Dockerfile.dev` |
