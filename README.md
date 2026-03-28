# AI Go Console

使用 AI Agent 團隊協助建立與管理 Web 應用程式的平台。

## 技術架構

- **框架**: Next.js 15 (App Router, Turbopack)
- **語言**: TypeScript 5.7, React 19
- **資料庫**: PostgreSQL + Prisma 6
- **認證**: NextAuth 4 (JWT)
- **樣式**: Tailwind CSS 4 + Radix UI
- **國際化**: next-intl (繁體中文 / English)
- **編輯器**: Monaco Editor
- **容器**: k3d/k8s + Traefik 反向代理
- **測試**: Playwright (E2E)

## 系統需求

- Node.js 18+
- pnpm
- Docker & Docker Compose
- PostgreSQL

## 快速開始

```bash
# 安裝依賴
pnpm install

# 啟動基礎服務 (PostgreSQL, Redis, Traefik 等)
bash scripts/setup.sh

# 設定環境變數
cp .env.example .env.local
# 編輯 .env.local 填入 DATABASE_URL, NEXTAUTH_SECRET 等

# 初始化資料庫
pnpm db:migrate
pnpm db:seed

# 啟動開發伺服器
pnpm dev
```

開啟 http://localhost:3000 即可使用。

## 測試帳號 (Seed 資料)

| Email | Password | Role | Organization |
|---|---|---|---|
| admin@example.com | password123 | admin | Acme Corp |
| alice@example.com | password123 | user | Acme Corp |
| bob@example.com | password123 | admin | Cool Startup |

## 主要功能

### 應用程式建立

- **快速建立**: 從 40+ 預設情境範本一鍵建立 (財務、法務、業務、人資、行銷等)
- **對話式建立**: 描述需求，由多 Agent 團隊協作完成

### Multi-Agent 系統

PM (產品經理) 統籌調度以下專家 Agent：

| Agent | 職責 |
|---|---|
| **Architect** | 設計系統架構、選擇技術方案與服務 |
| **Developer** | 撰寫應用程式碼 (支援平行開發) |
| **Reviewer** | 審查套件安全性與程式品質 |
| **DevOps** | 處理部署與基礎設施配置 |

### 服務整合

支援 30+ 種服務類型：

- **資料庫**: PostgreSQL, MySQL, MongoDB
- **儲存**: S3, GCS, Azure Blob, Google Drive
- **金流**: Stripe, PayPal, ECPay
- **郵件**: SendGrid, SES, Mailgun
- **簡訊**: Twilio, Vonage, AWS SNS
- **認證**: Auth0, Firebase Auth, LINE Login
- **平台**: Supabase, Hasura
- **聊天**: LINE Bot, WhatsApp, Discord, Telegram
- **AI**: OpenAI, Gemini, Claude

### 其他功能

- Docker 隔離環境執行應用
- 線上程式碼編輯器 (Monaco)
- 檔案管理與上傳
- 即時預覽
- 多組織與角色權限管理
- 自訂網域 (SSL)

## 專案結構

```
src/
├── app/                 # Next.js App Router
│   ├── (console)/       # 後台頁面 (需登入)
│   │   ├── apps/        # 應用管理
│   │   ├── create/      # 建立應用
│   │   ├── services/    # 服務管理
│   │   ├── settings/    # 設定
│   │   └── users/       # 使用者管理
│   ├── api/             # API Routes
│   └── login/           # 登入頁
├── components/          # React 元件
│   ├── chat/            # 聊天與 Agent 進度 UI
│   ├── file-manager/    # 檔案編輯器與管理
│   └── ui/              # 基礎 UI 元件 (Radix)
├── lib/                 # 核心邏輯
│   ├── actors/          # Actor Model (Agent 執行引擎)
│   ├── agents/          # Agent Prompts 與狀態管理
│   └── ...
├── messages/            # i18n 翻譯檔 (en, zh-TW)
└── middleware.ts        # 認證中介層
```

## 常用指令

```bash
pnpm dev              # 開發伺服器 (Turbopack)
pnpm build            # 建置生產版本
pnpm lint             # ESLint 檢查
pnpm db:migrate       # Prisma 資料庫遷移
pnpm db:push          # 推送 Schema 變更
pnpm db:seed          # 匯入測試資料
pnpm test:e2e         # 執行 E2E 測試
pnpm test:e2e:ui      # E2E 測試 (含 UI)
```

## Docker Compose 服務

| 服務 | 用途 | Port |
|---|---|---|
| postgres | 主資料庫 | 5432 |
| builtin-postgres | 應用內建 PostgreSQL | 5434 |
| disk-storage | 檔案儲存 | - |
| traefik | 反向代理 / SSL (Ingress Controller) | 80, 443 |
| redis | 訊息佇列 (BullMQ) | 6379 |

## License

Private
