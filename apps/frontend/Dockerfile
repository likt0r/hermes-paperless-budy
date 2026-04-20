FROM oven/bun:1.3.9-alpine AS pruner
WORKDIR /repo
RUN bun add -g turbo@2.8.14
COPY . .
RUN turbo prune frontend --docker

FROM oven/bun:1.3.9-alpine AS builder
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/bun.lock ./bun.lock
RUN bun install
COPY --from=pruner /repo/out/full/ .
RUN bun run build --filter=frontend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/apps/frontend/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
