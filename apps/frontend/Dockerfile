FROM node:22-alpine AS pruner
WORKDIR /repo
RUN npm install -g pnpm@10.30.3 turbo@2.8.14
COPY . .
RUN turbo prune frontend --docker

FROM node:22-alpine AS builder
WORKDIR /repo
RUN npm install -g pnpm@10.30.3
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm run build --filter=frontend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/apps/frontend/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
