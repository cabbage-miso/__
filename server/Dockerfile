FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY server/tsconfig.json ./
COPY server/src/ src/
RUN pnpm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
