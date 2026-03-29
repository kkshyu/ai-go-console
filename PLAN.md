# AI Go Console - Implementation Plan

## Context

Build a web-based console called "AI Go" that enables users to create, manage, and run independent web applications through a conversational interface. Each app is stored under an `apps/` directory, containerized with Docker, and can share centrally-managed credential credentials (Postgres, Supabase, etc.).

## Tech Stack

- **Next.js 15** (App Router) - full-stack framework
- **TypeScript** + **Tailwind CSS** + **shadcn/ui** - type safety + fast UI
- **PostgreSQL** + **Prisma ORM** - production-grade DB with easy `prisma migrate dev` migrations
- **Handlebars** - template rendering for app scaffolding
- **Node.js crypto** (AES-256-GCM) - credential encryption
- **k3d/k8s** - per-app container lifecycle
- **Traefik** (Ingress Controller) - auto-TLS, custom domain binding for each app
- **OpenRouter** - AI provider for conversational app creation (access to multiple models)
- **next-intl** - i18n for bilingual UI (繁體中文 + English)

## Project Structure

```
ai-go-console/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Sidebar + header layout
│   │   ├── page.tsx                # Dashboard: app grid + status
│   │   ├── create/page.tsx         # Chat-based app creation
│   │   ├── apps/
│   │   │   ├── page.tsx            # Apps list
│   │   │   └── [appId]/page.tsx    # App detail + logs + controls
│   │   ├── credentials/page.tsx   # Credential vault CRUD (admin only)
│   │   ├── users/page.tsx          # User management (admin only)
│   │   ├── login/page.tsx          # Login page
│   │   └── api/
│   │       ├── apps/               # App CRUD + lifecycle
│   │       ├── chat/route.ts       # Streaming chat endpoint
│   │       ├── credentials/       # Credential CRUD (admin only)
│   │       ├── users/             # User management (admin only)
│   │       └── auth/[...nextauth]/route.ts  # NextAuth handler
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── layout/                 # sidebar, header
│   │   ├── chat/                   # chat-panel, message, template-picker, preview-iframe
│   │   ├── apps/                   # app-card, status-badge
│   │   └── credentials/           # source-form, source-list
│   ├── lib/
│   │   ├── db/index.ts             # Prisma client singleton
│   │   ├── crypto.ts               # AES-256-GCM encrypt/decrypt
│   │   ├── generator.ts            # Template → app file generation
│   │   ├── dev-server.ts            # Dev server process manager (start/stop/track)
│   │   ├── docker.ts               # Docker build + compose exec helpers
│   │   ├── k8s/                    # Kubernetes client, ingress, reconciler
│   │   ├── ai.ts                   # OpenRouter client (OpenAI-compatible)
│   │   └── templates/              # Template registry + definitions
│   └── types/index.ts
├── templates/                       # Handlebars scaffold files
│   ├── react-spa/
│   ├── node-api/
│   └── nextjs-fullstack/
├── apps/                            # Generated apps (gitignored)
├── k8s/                             # Kubernetes manifests
│   ├── platform/                    # PostgreSQL, Redis, Built-in PG, Storage
│   ├── traefik/                     # Traefik Ingress Controller
│   ├── workers/                     # Background worker deployment
│   └── network-policies/
└── scripts/setup.sh                 # One-click setup (k3d cluster + services)
```

## Database Schema

Models in `prisma/schema.prisma`:

- **apps** - id, name, slug (unique folder name), description, template type, status, port, config (JSON), timestamps
- **app_domains** - id, appId (FK), domain (unique), isActive, sslStatus, createdAt — supports multiple custom domains per app, all stored in PostgreSQL
- **credentials** - id, name, type (postgres/supabase/mysql/redis), encrypted credentials + IV + authTag, timestamps
- **app_credentials** - junction table linking apps to credentials with env var prefix (e.g. `DB` → `DB_HOST`, `DB_PORT`...)
- **users** - id, email, name, passwordHash, role (enum: `admin` | `user`), createdAt
- **chat_messages** - id, appId, userId (FK), role, content, timestamp (conversation history per app)

## Implementation Phases

### Phase 1: Console Shell
- Init Next.js 15 + TypeScript + Tailwind + shadcn/ui
- Set up next-intl for bilingual support (繁體中文 + English), language toggle in header
- Add root `docker-compose.yml` with PostgreSQL service for the console's own DB
- Set up Prisma ORM, define `prisma/schema.prisma`, run `prisma migrate dev`
- Build layout: sidebar nav, header (with language switcher), dashboard page (empty state)
- Build credentials page: add/edit/delete credentials
- Implement `crypto.ts` for AES-256-GCM encryption

### Phase 2: App Templates & Generator
- Create 3 template directories (`react-spa`, `node-api`, `nextjs-fullstack`) with Handlebars files + Dockerfiles
- Implement `generator.ts`: reads templates, renders with config, writes to `apps/<slug>/`
- Build `POST /api/apps` endpoint
- Build apps list page + app detail page
- Port auto-assignment starting from 3100

### Phase 3: Conversational App Creation + Live Preview
- Set up OpenRouter AI client with streaming (OpenAI-compatible API)
- Design system prompt guiding AI through app creation flow
- Build `POST /api/chat` streaming endpoint
- Build chat UI components (chat-panel, message bubbles, template picker)
- Implement dev server manager: auto-start `npm run dev` / `vite dev` when app is scaffolded
- Embed preview iframe in chat page — user sees live app as AI builds it
- AI can modify app code iteratively, dev server hot-reloads changes
- Store chat history per app
- Track dev server processes (PID, port) in DB

### Phase 4: Publish & Docker Production
- "Publish" button triggers Docker build for the app
- Generate `Dockerfile` (multi-stage: build + serve) + `docker-compose.yml` per app
- `docker build -t app-<slug>` → `docker compose up -d` for production mode
- Stop dev server when publishing, switch to Docker container
- Implement lifecycle controls: start, stop, restart, logs for published apps
- Status polling on app detail page
- Apps are fully isolated — each app's docker-compose manages its own containers independently

### Phase 5: Reverse Proxy & Custom Domains
- Traefik Ingress Controller deployed via k3d/k8s
- Custom domains stored in PostgreSQL (`app_domains` table) as the single source of truth
- On app start/publish/domain change: `k8s/ingress.ts` syncs IngressRoute CRDs from DB state
- Default routing: `{org}.dev.localhost/{slug}` (dev) / `{org}.localhost/{slug}` (prod)
- Custom domain binding: user adds domain in app settings → saved to DB → IngressRoute reconciled
- `src/lib/k8s/ingress.ts` — manages Traefik IngressRoute + Middleware CRDs
- On console startup: sync all active domains from DB → ensure IngressRoute resources are current
- Console UI: domain management in app detail page (add/remove domains + DNS instructions)
- Traefik handles TLS automatically for custom domains (Let's Encrypt)

### Phase 6: Authentication & Authorization
- User model with two roles: **admin** and **user**
- Auth via NextAuth.js (credentials provider) with JWT session
- **Admin** permissions:
  - Manage all credential credentials (CRUD)
  - Assign/revoke credentials to/from apps
  - Manage users (invite, change role)
  - All user permissions
- **User** permissions:
  - Create, edit, delete their own apps
  - Use conversational AI to build apps
  - Manage custom domains for their apps
  - View (but not edit) assigned credentials
- Middleware: role-based route protection on API routes and pages
- First user to register becomes admin (seed admin)
- Login/register pages

### Phase 7: Polish
- Error handling across all API routes
- Loading states + optimistic UI updates
- App deletion (stop container → remove files → clean DB → remove proxy route)
- "Test Connection" for credentials
- Input validation on all forms

## Credential Flow
1. User adds credential via form → credentials encrypted with AES-256-GCM → stored in PostgreSQL (encrypted at application level)
2. When generating/starting an app, server decrypts linked credentials → injects as environment variables into app's `docker-compose.yml`
3. Credentials never shown decrypted in UI (masked display only)
4. `ENCRYPTION_KEY` auto-generated on first run → stored in `.env`
5. Credentials never written to plain-text `.env` files — only passed via Docker Compose environment config

## App Creation & Lifecycle Flow

### Stage 1: Development (對話式建立 + 即時預覽)
1. User describes app in chat → AI asks questions → starts scaffolding
2. Generator creates `apps/<slug>/` with source code
3. **Dev server auto-starts** (e.g., `npm run dev` / `vite dev`) for real-time preview
4. Preview iframe embedded in console UI — user sees changes live as AI iterates
5. User can continue chatting to refine the app, AI modifies code, dev server hot-reloads
6. Console tracks dev server process (PID, port) for each app in development

### Stage 2: Publish (Docker 生產模式)
1. User clicks "Publish" when satisfied with the preview
2. Console runs `docker build` to compile production Docker image for the app
3. Generates `docker-compose.yml` with production config + credential env vars
4. Starts app via `docker compose -f apps/<slug>/docker-compose.yml up -d`
5. Dev server is stopped, app now runs in production mode via Docker
6. App status changes from "developing" → "published" / "running"

### App States
- **developing** — dev server running, AI can modify code, live preview active
- **stopped** — no server running
- **building** — Docker image being built
- **running** — production Docker container active
- **error** — container or build failed

## Verification
- `npm run dev` → console runs at localhost:3000
- Navigate to Credentials → add a Postgres credential → verify it's stored encrypted
- Navigate to Create → chat to create a React SPA → verify `apps/<slug>/` created with correct files
- From app detail → click Start → verify Docker container runs → open app in browser
- Verify multiple apps can share the same credential credentials
