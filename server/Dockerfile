# ── Build stage: compile TypeScript & generate the Prisma client ──────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY server/package.json ./
RUN npm install
COPY server/ ./
RUN npx prisma generate && npx tsc -p tsconfig.json

# ── Runtime stage: production deps only ───────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
# Generate the client against the production node_modules.
RUN npx prisma generate
EXPOSE 4000
# Apply any pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
