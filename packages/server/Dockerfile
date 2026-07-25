FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/shared/package*.json ./packages/shared/
RUN npm install --workspace=packages/server --workspace=packages/shared
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN npm run build -w packages/shared && npm run build -w packages/server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/src/db/schema.sql ./src/db/schema.sql
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/package.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
