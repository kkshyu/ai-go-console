FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy source code needed by the worker
COPY src/lib/ ./src/lib/
COPY src/workers/ ./src/workers/

# The worker uses tsx to run TypeScript directly
RUN pnpm add tsx

CMD ["npx", "tsx", "src/workers/background-worker.ts"]
